"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const ALLOWED_ROLES = new Set(["super_admin", "company_admin", "manager", "dispatcher"])
const quoteStatuses = ["draft", "sent", "approved", "accepted", "rejected", "expired", "converted"] as const
const currencyCodes = ["USD", "ZAR", "BWP", "NAD", "ZWL", "ZMW", "MZN"] as const

const quoteItemSchema = z.object({
  description: z.string().trim().min(1, "Line items require a description"),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
  unit_price: z.coerce.number().min(0, "Unit price cannot be negative"),
})

const createQuoteSchema = z.object({
  quote_number: z.string().trim().min(1).optional().nullable(),
  customer_id: z.string().uuid("Invalid customer ID"),
  status: z.enum(quoteStatuses).default("draft"),
  valid_from: z.coerce.date().optional().nullable(),
  valid_until: z.coerce.date().optional().nullable(),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => currencyCodes.includes(value as (typeof currencyCodes)[number]), "Unsupported currency"),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().optional().nullable(),
  items: z.array(quoteItemSchema).min(1, "At least one line item is required"),
})

export type CreateQuoteInput = z.input<typeof createQuoteSchema>
export type UpdateQuoteInput = CreateQuoteInput

type QuoteActionResult = {
  success: boolean
  error?: string
  quoteId?: string
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

  if (!ALLOWED_ROLES.has(profile.role)) {
    return { error: "Insufficient permissions" as const }
  }

  return { supabase, profile }
}

const buildFallbackQuoteNumber = () => {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)
  const month = (now.getMonth() + 1).toString().padStart(2, "0")
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")

  return `QT-${year}${month}-${random}`
}

const roundToCents = (value: number) => Math.round(value * 100) / 100

const formatDateOrNull = (value?: Date | null) => (value ? value.toISOString().split("T")[0] : null)

const buildQuoteTotals = (items: z.infer<typeof quoteItemSchema>[], taxRate: number) => {
  const subtotal = items.reduce((acc, item) => acc + item.quantity * item.unit_price, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const totalAmount = subtotal + taxAmount

  return {
    subtotal: roundToCents(subtotal),
    taxAmount: roundToCents(taxAmount),
    totalAmount: roundToCents(totalAmount),
  }
}

export async function createQuote(input: CreateQuoteInput): Promise<QuoteActionResult> {
  const parsed = createQuoteSchema.safeParse(input)

  if (!parsed.success) {
    console.error("[quote-create] Validation failure", parsed.error.flatten())
    return { success: false, error: "Invalid quote payload" }
  }

  const payload = parsed.data

  const context = await getAuthorizedContext()

  if ("error" in context) {
    return { success: false, error: context.error }
  }

  const { supabase, profile } = context

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("company_id")
    .eq("id", payload.customer_id)
    .single()

  if (customerError || customer?.company_id !== profile.company_id) {
    return { success: false, error: "Customer not found" }
  }

  let quoteNumber = payload.quote_number ?? null

  if (!quoteNumber) {
    const { data, error } = await supabase.rpc("next_document_number", {
      doc_type: "quote",
      in_company_id: profile.company_id,
      in_customer_id: payload.customer_id,
    })

    if (error) {
      console.error("[quote-create] Failed to generate document number", error)
    }

    quoteNumber = (typeof data === "string" && data.length > 0 ? data : null) ?? buildFallbackQuoteNumber()
  }

  const { subtotal, taxAmount, totalAmount } = buildQuoteTotals(payload.items, payload.tax_rate ?? 0)

  const quoteRecord = {
    company_id: profile.company_id,
    customer_id: payload.customer_id,
    dispatcher_id: profile.id,
    quote_number: quoteNumber,
    status: payload.status ?? "draft",
    valid_from: formatDateOrNull(payload.valid_from ?? null),
    valid_until: formatDateOrNull(payload.valid_until ?? null),
    currency: payload.currency,
    subtotal,
    tax_rate: payload.tax_rate ?? 0,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    notes: payload.notes ?? null,
  }

  const { data: insertData, error: insertError } = await supabase.from("quotes").insert(quoteRecord).select("id").single()

  if (insertError || !insertData?.id) {
    console.error("[quote-create] Failed to insert quote", insertError)
    return { success: false, error: "Unable to create quote" }
  }

  const quoteId = insertData.id as string

  const itemRecords = payload.items.map((item, index) => ({
    quote_id: quoteId,
    line_number: index + 1,
    description: item.description,
    quantity: roundToCents(item.quantity),
    unit_price: roundToCents(item.unit_price),
    line_total: roundToCents(item.quantity * item.unit_price),
  }))

  if (itemRecords.length > 0) {
    const { error: itemError } = await supabase.from("quote_items").insert(itemRecords)

    if (itemError) {
      console.error("[quote-create] Failed to insert quote items", itemError)
      return { success: false, error: "Unable to create quote items" }
    }
  }

  revalidatePath("/financial/quotes")
  revalidatePath(`/financial/quotes/${quoteId}`)

  return { success: true, quoteId }
}

export async function updateQuote(quoteId: string, input: UpdateQuoteInput): Promise<QuoteActionResult> {
  const parsed = createQuoteSchema.safeParse(input)

  if (!parsed.success) {
    console.error("[quote-update] Validation failure", parsed.error.flatten())
    return { success: false, error: "Invalid quote payload" }
  }

  const payload = parsed.data

  const context = await getAuthorizedContext()

  if ("error" in context) {
    return { success: false, error: context.error }
  }

  const { supabase, profile } = context

  const { data: existing, error: existingError } = await supabase
    .from("quotes")
    .select("company_id, quote_number")
    .eq("id", quoteId)
    .single()

  if (existingError || existing?.company_id !== profile.company_id) {
    return { success: false, error: "Quote not found" }
  }

  const { subtotal, taxAmount, totalAmount } = buildQuoteTotals(payload.items, payload.tax_rate ?? 0)

  const updateRecord = {
    customer_id: payload.customer_id,
    dispatcher_id: profile.id,
    quote_number: payload.quote_number ?? existing.quote_number,
    status: payload.status ?? "draft",
    valid_from: formatDateOrNull(payload.valid_from ?? null),
    valid_until: formatDateOrNull(payload.valid_until ?? null),
    currency: payload.currency,
    subtotal,
    tax_rate: payload.tax_rate ?? 0,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    notes: payload.notes ?? null,
    updated_at: new Date().toISOString(),
  }

  const { error: updateError } = await supabase
    .from("quotes")
    .update(updateRecord)
    .eq("id", quoteId)
    .eq("company_id", profile.company_id)

  if (updateError) {
    console.error("[quote-update] Failed to update quote", updateError)
    return { success: false, error: "Unable to update quote" }
  }

  const { error: deleteError } = await supabase.from("quote_items").delete().eq("quote_id", quoteId)

  if (deleteError) {
    console.error("[quote-update] Failed to delete existing quote items", deleteError)
    return { success: false, error: "Unable to update quote items" }
  }

  const itemRecords = payload.items.map((item, index) => ({
    quote_id: quoteId,
    line_number: index + 1,
    description: item.description,
    quantity: roundToCents(item.quantity),
    unit_price: roundToCents(item.unit_price),
    line_total: roundToCents(item.quantity * item.unit_price),
  }))

  if (itemRecords.length > 0) {
    const { error: insertItemsError } = await supabase.from("quote_items").insert(itemRecords)

    if (insertItemsError) {
      console.error("[quote-update] Failed to insert quote items", insertItemsError)
      return { success: false, error: "Unable to update quote items" }
    }
  }

  revalidatePath("/financial/quotes")
  revalidatePath(`/financial/quotes/${quoteId}`)

  return { success: true, quoteId }
}
