"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import type { PaymentStatus } from "@/lib/types/database"

const currencyCodes = ["USD", "ZAR", "BWP", "NAD", "ZWL", "ZMW", "MZN"] as const

const invoiceItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().trim().min(1, "Line items require a description"),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
  unit_price: z.coerce.number().min(0, "Unit price cannot be negative"),
  total: z.coerce.number().optional(),
})

const createInvoiceSchema = z.object({
  invoice_number: z.string().trim().min(1).optional().nullable(),
  customer_id: z.string().uuid("Invalid customer ID"),
  load_id: z.string().uuid("Invalid load ID").optional().nullable(),
  source_load_id: z.string().uuid("Invalid source load ID").optional().nullable(),
  quote_id: z.string().uuid("Invalid quote ID").optional().nullable(),
  invoice_date: z.coerce.date(),
  due_date: z.coerce.date().optional().nullable(),
  payment_terms: z.coerce.number().int().min(0).max(365),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => currencyCodes.includes(value as (typeof currencyCodes)[number]), "Unsupported currency"),
  tax_rate: z.coerce.number().min(0).max(100),
  notes: z.string().optional().nullable(),
  items: z.array(invoiceItemSchema).min(1, "At least one invoice item is required"),
  origin_metadata: z.record(z.any()).optional().nullable(),
  auto_items: z.boolean().optional(),
})

export type CreateInvoiceInput = z.input<typeof createInvoiceSchema>
type CreateInvoiceData = z.infer<typeof createInvoiceSchema>

const AUTHORIZED_ROLES = new Set(["super_admin", "company_admin", "manager"])

const REMINDER_WEBHOOK_URL = process.env.INVOICE_REMINDER_WEBHOOK_URL
const REMINDER_FUNCTION_NAME = process.env.INVOICE_REMINDER_FUNCTION ?? "send-invoice-reminder"

type ActionResult = {
  success: boolean
  error?: string
}

type CreateInvoiceResult = ActionResult & {
  invoiceId?: string
}

type ReminderPayload = {
  invoiceId: string
  companyId: string
  requestedBy: string
  status: PaymentStatus
}

async function getAuthorizedContext() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Not authenticated" as const }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, company_id, role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile?.company_id) {
    return { error: "Profile not found" as const }
  }

  if (!AUTHORIZED_ROLES.has(profile.role)) {
    return { error: "Insufficient permissions" as const }
  }

  return { supabase, profile }
}

async function dispatchInvoiceReminder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  payload: ReminderPayload,
): Promise<{ dispatched: boolean; channel?: "webhook" | "supabase-function" }> {
  if (REMINDER_WEBHOOK_URL) {
    try {
      const response = await fetch(REMINDER_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        return { dispatched: true, channel: "webhook" }
      }

      const body = await response.text()
      console.error("[invoice-reminder] Webhook responded with", response.status, body)
    } catch (error) {
      console.error("[invoice-reminder] Webhook dispatch failed", error)
    }
  }

  try {
    const { error } = await supabase.functions.invoke(REMINDER_FUNCTION_NAME, {
      body: payload,
    })

    if (!error) {
      return { dispatched: true, channel: "supabase-function" }
    }

    console.error("[invoice-reminder] Supabase function error", error)
  } catch (error) {
    console.error("[invoice-reminder] Supabase function dispatch failed", error)
  }

  return { dispatched: false }
}

const buildFallbackInvoiceNumber = () => {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")

  return `INV-${year}${month}-${random}`
}

const formatDateForSql = (value: Date) => value.toISOString().split("T")[0]

const calculateTotals = (items: CreateInvoiceData["items"], taxRate: number) => {
  const subtotal = items.reduce((acc, item) => acc + item.quantity * item.unit_price, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const totalAmount = subtotal + taxAmount

  const roundToCents = (amount: number) => Math.round(amount * 100) / 100

  return {
    subtotal: roundToCents(subtotal),
    taxAmount: roundToCents(taxAmount),
    totalAmount: roundToCents(totalAmount),
  }
}

export async function createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult> {
  const parsed = createInvoiceSchema.safeParse(input)

  if (!parsed.success) {
    console.error("[invoice-create] Validation failure", parsed.error.flatten())
    return { success: false, error: "Invalid invoice payload" }
  }

  const payload = parsed.data

  const context = await getAuthorizedContext()

  if ("error" in context) {
    return { success: false, error: context.error }
  }

  const { supabase, profile } = context

  const customerResult = await supabase
    .from("customers")
    .select("company_id")
    .eq("id", payload.customer_id)
    .single()

  if (customerResult.error || customerResult.data?.company_id !== profile.company_id) {
    return { success: false, error: "Customer not found" }
  }

  const sourceLoadId = payload.source_load_id ?? payload.load_id ?? null

  if (payload.load_id) {
    const loadResult = await supabase.from("loads").select("company_id").eq("id", payload.load_id).single()

    if (loadResult.error || loadResult.data?.company_id !== profile.company_id) {
      return { success: false, error: "Invalid load reference" }
    }
  }

  if (payload.quote_id) {
    const quoteResult = await supabase
      .from("quotes")
      .select("company_id")
      .eq("id", payload.quote_id)
      .single()

    if (quoteResult.error || quoteResult.data?.company_id !== profile.company_id) {
      return { success: false, error: "Invalid quote reference" }
    }
  }

  let invoiceNumber = payload.invoice_number ?? null

  if (!invoiceNumber) {
    const { data, error } = await supabase.rpc("next_document_number", {
      doc_type: "invoice",
      in_company_id: profile.company_id,
      in_customer_id: payload.customer_id,
    })

    if (error) {
      console.error("[invoice-create] Failed to generate document number", error)
    }

    invoiceNumber = (typeof data === "string" && data.length > 0 ? data : null) ?? buildFallbackInvoiceNumber()
  }

  const invoiceDate = payload.invoice_date
  const dueDate = payload.due_date ?? new Date(invoiceDate.getTime() + payload.payment_terms * 24 * 60 * 60 * 1000)

  const { subtotal, taxAmount, totalAmount } = calculateTotals(payload.items, payload.tax_rate)

  const originMetadata = payload.origin_metadata
    ? payload.origin_metadata
    : payload.quote_id
      ? {
          source: "quote",
          quote_id: payload.quote_id,
          load_id: sourceLoadId,
          auto_items: payload.auto_items ?? false,
        }
      : sourceLoadId
        ? {
            source: "load",
            load_id: sourceLoadId,
          }
        : null

  const invoiceRecord = {
    company_id: profile.company_id,
    customer_id: payload.customer_id,
    load_id: payload.load_id ?? null,
    source_load_id: sourceLoadId,
    quote_id: payload.quote_id ?? null,
    invoice_number: invoiceNumber,
    invoice_date: formatDateForSql(invoiceDate),
    issue_date: formatDateForSql(invoiceDate),
    due_date: formatDateForSql(dueDate),
    payment_terms: payload.payment_terms,
    currency: payload.currency,
    tax_rate: payload.tax_rate,
    subtotal,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    status: "pending",
    notes: payload.notes ?? null,
    origin_metadata: originMetadata,
    items: payload.items.map((item, index) => ({
      line_number: index + 1,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: Math.round(item.quantity * item.unit_price * 100) / 100,
    })),
  }

  const { data: insertData, error: insertError } = await supabase.from("invoices").insert(invoiceRecord).select("id").single()

  if (insertError || !insertData?.id) {
    console.error("[invoice-create] Failed to insert invoice", insertError)
    return { success: false, error: "Unable to create invoice" }
  }

  if (payload.quote_id) {
    const updatePayload: Record<string, unknown> = { status: "converted" }

    if (sourceLoadId) {
      updatePayload.converted_load_id = sourceLoadId
    }

    const { error: quoteUpdateError } = await supabase
      .from("quotes")
      .update(updatePayload)
      .eq("id", payload.quote_id)
      .eq("company_id", profile.company_id)

    if (quoteUpdateError) {
      console.error("[invoice-create] Failed to update quote reference", quoteUpdateError)
    }

    if (sourceLoadId) {
      const { error: loadUpdateError } = await supabase
        .from("loads")
        .update({ quote_id: payload.quote_id })
        .eq("id", sourceLoadId)
        .eq("company_id", profile.company_id)

      if (loadUpdateError) {
        console.error("[invoice-create] Failed to link load to quote", loadUpdateError)
      }
    }
  }

  revalidatePath("/financial/invoices")
  revalidatePath(`/financial/invoices/${insertData.id}`)

  return { success: true, invoiceId: insertData.id }
}

export async function markInvoiceAsPaid(invoiceId: string): Promise<ActionResult> {
  const context = await getAuthorizedContext()

  if ("error" in context) {
    return { success: false, error: context.error }
  }

  const { supabase, profile } = context

  const { data: invoice, error: fetchError } = await supabase
    .from("invoices")
    .select("id, company_id, status")
    .eq("id", invoiceId)
    .single()

  if (fetchError || !invoice) {
    return { success: false, error: "Invoice not found" }
  }

  if (invoice.company_id !== profile.company_id) {
    return { success: false, error: "Unauthorized access" }
  }

  if (invoice.status === "paid") {
    return { success: true }
  }

  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      status: "paid",
      paid_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)

  if (updateError) {
    return { success: false, error: "Failed to update invoice" }
  }

  revalidatePath("/financial/invoices")
  revalidatePath(`/financial/invoices/${invoiceId}`)

  return { success: true }
}

export async function sendInvoiceReminder(invoiceId: string): Promise<ActionResult> {
  const context = await getAuthorizedContext()

  if ("error" in context) {
    return { success: false, error: context.error }
  }

  const { supabase, profile } = context

  const { data: invoice, error: fetchError } = await supabase
    .from("invoices")
    .select("id, company_id, status")
    .eq("id", invoiceId)
    .single()

  if (fetchError || !invoice) {
    return { success: false, error: "Invoice not found" }
  }

  if (invoice.company_id !== profile.company_id) {
    return { success: false, error: "Unauthorized access" }
  }

  if (invoice.status === "paid" || invoice.status === "cancelled") {
    return { success: false, error: "Reminders can only be sent for active invoices" }
  }

  const payload: ReminderPayload = {
    invoiceId,
    companyId: invoice.company_id,
    requestedBy: profile.id,
    status: invoice.status,
  }

  const { dispatched, channel } = await dispatchInvoiceReminder(supabase, payload)

  if (!dispatched) {
    return { success: false, error: "Failed to dispatch reminder" }
  }

  console.info("[invoice-reminder] Reminder dispatched", { invoiceId, channel })

  revalidatePath("/financial/invoices")
  revalidatePath(`/financial/invoices/${invoiceId}`)

  return { success: true }
}
