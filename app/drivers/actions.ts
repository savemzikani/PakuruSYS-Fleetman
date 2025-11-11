"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const ALLOWED_ROLES = new Set(["super_admin", "company_admin", "manager", "dispatcher"])

const driverSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(255),
  last_name: z.string().trim().min(1, "Last name is required").max(255),
  email: z.string().trim().email().optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  license_number: z.string().trim().min(1, "License number is required").max(255),
  license_expiry: z.coerce.date({ invalid_type_error: "License expiry must be a valid date" }),
  address: z.string().trim().max(1024).optional().nullable(),
  emergency_contact_name: z.string().trim().max(255).optional().nullable(),
  emergency_contact_phone: z.string().trim().max(50).optional().nullable(),
  is_active: z.boolean().default(true),
})

export type DriverInput = z.input<typeof driverSchema>

interface DriverActionResult {
  success: boolean
  error?: string
  driverId?: string
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

const toDateOnlyString = (date: Date) => date.toISOString().split("T")[0]

export async function createDriver(input: DriverInput): Promise<DriverActionResult> {
  const parsed = driverSchema.safeParse(input)

  if (!parsed.success) {
    console.error("[driver-create] Validation failure", parsed.error.flatten())
    return { success: false, error: "Invalid driver payload" }
  }

  const payload = parsed.data

  const context = await getAuthorizedContext()

  if ("error" in context) {
    return { success: false, error: context.error }
  }

  const { supabase, profile } = context

  const record = {
    company_id: profile.company_id,
    first_name: payload.first_name.trim(),
    last_name: payload.last_name.trim(),
    email: sanitize(payload.email),
    phone: sanitize(payload.phone),
    license_number: payload.license_number.trim(),
    license_expiry: toDateOnlyString(payload.license_expiry),
    address: sanitize(payload.address),
    emergency_contact_name: sanitize(payload.emergency_contact_name),
    emergency_contact_phone: sanitize(payload.emergency_contact_phone),
    is_active: payload.is_active ?? true,
  }

  const { data, error } = await supabase.from("drivers").insert(record).select("id").single()

  if (error || !data?.id) {
    console.error("[driver-create] Failed to insert driver", error)
    return { success: false, error: "Unable to create driver" }
  }

  const driverId = data.id as string

  revalidatePath("/drivers")
  revalidatePath(`/drivers/${driverId}`)

  return { success: true, driverId }
}

export async function updateDriver(driverId: string, input: DriverInput): Promise<DriverActionResult> {
  const parsed = driverSchema.safeParse(input)

  if (!parsed.success) {
    console.error("[driver-update] Validation failure", parsed.error.flatten())
    return { success: false, error: "Invalid driver payload" }
  }

  const payload = parsed.data

  const context = await getAuthorizedContext()

  if ("error" in context) {
    return { success: false, error: context.error }
  }

  const { supabase, profile } = context

  const { data: existing, error: existingError } = await supabase
    .from("drivers")
    .select("company_id")
    .eq("id", driverId)
    .single()

  if (existingError || existing?.company_id !== profile.company_id) {
    return { success: false, error: "Driver not found" }
  }

  const updateRecord = {
    first_name: payload.first_name.trim(),
    last_name: payload.last_name.trim(),
    email: sanitize(payload.email),
    phone: sanitize(payload.phone),
    license_number: payload.license_number.trim(),
    license_expiry: toDateOnlyString(payload.license_expiry),
    address: sanitize(payload.address),
    emergency_contact_name: sanitize(payload.emergency_contact_name),
    emergency_contact_phone: sanitize(payload.emergency_contact_phone),
    is_active: payload.is_active ?? true,
    updated_at: new Date().toISOString(),
  }

  const { error: updateError } = await supabase
    .from("drivers")
    .update(updateRecord)
    .eq("id", driverId)
    .eq("company_id", profile.company_id)

  if (updateError) {
    console.error("[driver-update] Failed to update driver", updateError)
    return { success: false, error: "Unable to update driver" }
  }

  revalidatePath("/drivers")
  revalidatePath(`/drivers/${driverId}`)

  return { success: true, driverId }
}
