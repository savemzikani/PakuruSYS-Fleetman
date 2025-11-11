"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const ALLOWED_ROLES = new Set(["super_admin", "company_admin", "manager", "dispatcher"])
const loadStatuses = ["pending", "assigned", "in_transit", "delivered", "cancelled"] as const
const currencyCodes = ["USD", "ZAR", "BWP", "NAD", "ZWL", "ZMW", "MZN"] as const

const optionalString = z.string().trim().min(1).max(512)

const loadBaseSchema = z.object({
  load_number: z.string().trim().min(1).max(64).optional().nullable(),
  customer_id: z.string().uuid("Invalid customer ID"),
  quote_id: z.string().uuid("Invalid quote ID").optional().nullable(),
  description: optionalString.max(1024).optional().nullable(),
  weight_kg: z.number().min(0, "Weight must be positive").optional().nullable(),
  volume_m3: z.number().min(0, "Volume must be positive").optional().nullable(),
  pickup_address: optionalString.optional().nullable(),
  pickup_city: optionalString.optional().nullable(),
  pickup_country: optionalString.optional().nullable(),
  pickup_date: z.string().trim().optional().nullable(),
  delivery_address: optionalString.optional().nullable(),
  delivery_city: optionalString.optional().nullable(),
  delivery_country: optionalString.optional().nullable(),
  delivery_date: z.string().trim().optional().nullable(),
  rate: z.number().min(0, "Rate cannot be negative").optional().nullable(),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => currencyCodes.includes(value as (typeof currencyCodes)[number]), "Unsupported currency"),
  special_instructions: z.string().trim().max(2048).optional().nullable(),
  origin_metadata: z.record(z.any()).optional().nullable(),
})

const createLoadSchema = loadBaseSchema.extend({
  status: z.enum(loadStatuses).optional(),
})

const updateLoadSchema = loadBaseSchema.extend({
  status: z.enum(loadStatuses),
})

export type CreateLoadInput = z.input<typeof createLoadSchema>
export type UpdateLoadInput = z.input<typeof updateLoadSchema>

interface LoadActionResult {
  success: boolean
  error?: string
  loadId?: string
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

const sanitizeText = (value?: string | null) => {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const sanitizeNumber = (value?: number | null) => (typeof value === "number" && Number.isFinite(value) ? value : null)

const buildCustomerCode = (customerName?: string | null) => {
  const normalized = (customerName ?? "CST").replace(/[^A-Za-z0-9]/g, "").toUpperCase()
  return normalized.length >= 3 ? normalized.slice(0, 3) : normalized.padEnd(3, "X")
}

const buildFallbackLoadNumber = (customerName?: string | null) => {
  const code = buildCustomerCode(customerName)
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)
  const month = (now.getMonth() + 1).toString().padStart(2, "0")
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")

  return `LD-${code}-${year}${month}-${random}`
}

export async function createLoad(input: CreateLoadInput): Promise<LoadActionResult> {
  const parsed = createLoadSchema.safeParse({
    ...input,
    description: sanitizeText(input.description),
    pickup_address: sanitizeText(input.pickup_address),
    pickup_city: sanitizeText(input.pickup_city),
    pickup_country: sanitizeText(input.pickup_country),
    delivery_address: sanitizeText(input.delivery_address),
    delivery_city: sanitizeText(input.delivery_city),
    delivery_country: sanitizeText(input.delivery_country),
    special_instructions: sanitizeText(input.special_instructions),
    weight_kg: sanitizeNumber(input.weight_kg),
    volume_m3: sanitizeNumber(input.volume_m3),
    rate: sanitizeNumber(input.rate),
  })

  if (!parsed.success) {
    console.error("[load-create] Validation failure", parsed.error.flatten())
    return { success: false, error: "Invalid load payload" }
  }

  const payload = parsed.data

  const context = await getAuthorizedContext()

  if ("error" in context) {
    return { success: false, error: context.error }
  }

  const { supabase, profile } = context

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("company_id, name")
    .eq("id", payload.customer_id)
    .single()

  if (customerError || customer?.company_id !== profile.company_id) {
    return { success: false, error: "Customer not found" }
  }

  let loadNumber = payload.load_number ?? null

  if (!loadNumber) {
    const { data, error } = await supabase.rpc("next_document_number", {
      doc_type: "load",
      in_company_id: profile.company_id,
      in_customer_id: payload.customer_id,
    })

    if (error) {
      console.error("[load-create] Failed to generate document number", error)
    }

    if (typeof data === "string" && data.length > 0) {
      loadNumber = data
    } else {
      loadNumber = buildFallbackLoadNumber(customer?.name)
    }
  }

  const record = {
    company_id: profile.company_id,
    load_number: loadNumber,
    customer_id: payload.customer_id,
    quote_id: payload.quote_id ?? null,
    description: payload.description ?? null,
    weight_kg: payload.weight_kg ?? null,
    volume_m3: payload.volume_m3 ?? null,
    pickup_address: payload.pickup_address ?? null,
    pickup_city: payload.pickup_city ?? null,
    pickup_country: payload.pickup_country ?? null,
    pickup_date: payload.pickup_date ?? null,
    delivery_address: payload.delivery_address ?? null,
    delivery_city: payload.delivery_city ?? null,
    delivery_country: payload.delivery_country ?? null,
    delivery_date: payload.delivery_date ?? null,
    rate: payload.rate ?? null,
    currency: payload.currency,
    special_instructions: payload.special_instructions ?? null,
    status: payload.status ?? "pending",
    dispatcher_id: profile.id,
    origin_metadata: payload.origin_metadata ?? null,
  }

  const { data: insertData, error: insertError } = await supabase.from("loads").insert(record).select("id").single()

  if (insertError || !insertData?.id) {
    console.error("[load-create] Failed to insert load", insertError)
    return { success: false, error: "Unable to create load" }
  }

  const loadId = insertData.id as string

  if (payload.quote_id) {
    const { error: quoteUpdateError } = await supabase
      .from("quotes")
      .update({ status: "converted", converted_load_id: loadId })
      .eq("id", payload.quote_id)
      .eq("company_id", profile.company_id)

    if (quoteUpdateError) {
      console.error("[load-create] Failed to update linked quote", quoteUpdateError)
    }
  }

  revalidatePath("/loads")

  return { success: true, loadId }
}

export async function updateLoad(loadId: string, input: UpdateLoadInput): Promise<LoadActionResult> {
  const parsed = updateLoadSchema.safeParse({
    ...input,
    description: sanitizeText(input.description),
    pickup_address: sanitizeText(input.pickup_address),
    pickup_city: sanitizeText(input.pickup_city),
    pickup_country: sanitizeText(input.pickup_country),
    delivery_address: sanitizeText(input.delivery_address),
    delivery_city: sanitizeText(input.delivery_city),
    delivery_country: sanitizeText(input.delivery_country),
    special_instructions: sanitizeText(input.special_instructions),
    weight_kg: sanitizeNumber(input.weight_kg),
    volume_m3: sanitizeNumber(input.volume_m3),
    rate: sanitizeNumber(input.rate),
  })

  if (!parsed.success) {
    console.error("[load-update] Validation failure", parsed.error.flatten())
    return { success: false, error: "Invalid load payload" }
  }

  const payload = parsed.data

  const context = await getAuthorizedContext()

  if ("error" in context) {
    return { success: false, error: context.error }
  }

  const { supabase, profile } = context

  const { data: existing, error: existingError } = await supabase
    .from("loads")
    .select("company_id")
    .eq("id", loadId)
    .single()

  if (existingError || existing?.company_id !== profile.company_id) {
    return { success: false, error: "Load not found" }
  }

  const updatePayload = {
    load_number: payload.load_number ?? null,
    customer_id: payload.customer_id,
    quote_id: payload.quote_id ?? null,
    description: payload.description ?? null,
    weight_kg: payload.weight_kg ?? null,
    volume_m3: payload.volume_m3 ?? null,
    pickup_address: payload.pickup_address ?? null,
    pickup_city: payload.pickup_city ?? null,
    pickup_country: payload.pickup_country ?? null,
    pickup_date: payload.pickup_date ?? null,
    delivery_address: payload.delivery_address ?? null,
    delivery_city: payload.delivery_city ?? null,
    delivery_country: payload.delivery_country ?? null,
    delivery_date: payload.delivery_date ?? null,
    rate: payload.rate ?? null,
    currency: payload.currency,
    special_instructions: payload.special_instructions ?? null,
    status: payload.status,
    origin_metadata: payload.origin_metadata ?? null,
  }

  const { error: updateError } = await supabase
    .from("loads")
    .update(updatePayload)
    .eq("id", loadId)
    .eq("company_id", profile.company_id)

  if (updateError) {
    console.error("[load-update] Failed to update load", updateError)
    return { success: false, error: "Unable to update load" }
  }

  revalidatePath("/loads")
  revalidatePath(`/loads/${loadId}`)

  return { success: true, loadId }
}
