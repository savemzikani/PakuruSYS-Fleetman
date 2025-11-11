"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const ALLOWED_ROLES = new Set(["super_admin", "company_admin", "manager", "dispatcher"])

const customerSchema = z.object({
  name: z.string().trim().min(1, "Company name is required").max(255),
  contact_person: z.string().trim().min(1).max(255).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  address: z.string().trim().max(1024).optional().nullable(),
  city: z.string().trim().max(255).optional().nullable(),
  country: z.string().trim().max(255).optional().nullable(),
  postal_code: z.string().trim().max(32).optional().nullable(),
  tax_number: z.string().trim().max(128).optional().nullable(),
  credit_limit: z.coerce.number().min(0).default(0),
  payment_terms: z.coerce.number().int().min(0).max(365).default(30),
  is_active: z.boolean().default(true),
})

export type CreateCustomerInput = z.input<typeof customerSchema>
export type UpdateCustomerInput = z.input<typeof customerSchema>

interface CustomerActionResult {
  success: boolean
  error?: string
  customerId?: string
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

const sanitize = (value?: string | null) => {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function createCustomer(input: CreateCustomerInput): Promise<CustomerActionResult> {
  const parsed = customerSchema.safeParse(input)

  if (!parsed.success) {
    console.error("[customer-create] Validation failure", parsed.error.flatten())
    return { success: false, error: "Invalid customer payload" }
  }

  const payload = parsed.data

  const context = await getAuthorizedContext()

  if ("error" in context) {
    return { success: false, error: context.error }
  }

  const { supabase, profile } = context

  const record = {
    company_id: profile.company_id,
    name: payload.name.trim(),
    contact_person: sanitize(payload.contact_person),
    email: sanitize(payload.email),
    phone: sanitize(payload.phone),
    address: sanitize(payload.address),
    city: sanitize(payload.city),
    country: sanitize(payload.country),
    postal_code: sanitize(payload.postal_code),
    tax_number: sanitize(payload.tax_number),
    credit_limit: payload.credit_limit ?? 0,
    payment_terms: payload.payment_terms ?? 30,
    is_active: payload.is_active ?? true,
  }

  const { data, error } = await supabase.from("customers").insert(record).select("id").single()

  if (error || !data?.id) {
    console.error("[customer-create] Failed to insert customer", error)
    return { success: false, error: "Unable to create customer" }
  }

  const customerId = data.id as string

  revalidatePath("/customers")
  revalidatePath(`/customers/${customerId}`)

  return { success: true, customerId }
}

export async function updateCustomer(customerId: string, input: UpdateCustomerInput): Promise<CustomerActionResult> {
  const parsed = customerSchema.safeParse(input)

  if (!parsed.success) {
    console.error("[customer-update] Validation failure", parsed.error.flatten())
    return { success: false, error: "Invalid customer payload" }
  }

  const payload = parsed.data

  const context = await getAuthorizedContext()

  if ("error" in context) {
    return { success: false, error: context.error }
  }

  const { supabase, profile } = context

  const { data: existing, error: existingError } = await supabase
    .from("customers")
    .select("company_id")
    .eq("id", customerId)
    .single()

  if (existingError || existing?.company_id !== profile.company_id) {
    return { success: false, error: "Customer not found" }
  }

  const updateRecord = {
    name: payload.name.trim(),
    contact_person: sanitize(payload.contact_person),
    email: sanitize(payload.email),
    phone: sanitize(payload.phone),
    address: sanitize(payload.address),
    city: sanitize(payload.city),
    country: sanitize(payload.country),
    postal_code: sanitize(payload.postal_code),
    tax_number: sanitize(payload.tax_number),
    credit_limit: payload.credit_limit ?? 0,
    payment_terms: payload.payment_terms ?? 30,
    is_active: payload.is_active ?? true,
    updated_at: new Date().toISOString(),
  }

  const { error: updateError } = await supabase
    .from("customers")
    .update(updateRecord)
    .eq("id", customerId)
    .eq("company_id", profile.company_id)

  if (updateError) {
    console.error("[customer-update] Failed to update customer", updateError)
    return { success: false, error: "Unable to update customer" }
  }

  revalidatePath("/customers")
  revalidatePath(`/customers/${customerId}`)

  return { success: true, customerId }
}
