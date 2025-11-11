"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const updateCompanyProfileSchema = z.object({
  name: z.string().trim().min(2, "Company name must be at least 2 characters").max(120),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().max(50).optional(),
  address: z.string().trim().max(255).optional(),
  city: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().max(20).optional(),
})

const updateNotificationPreferencesSchema = z.object({
  loadUpdates: z.boolean(),
  invoiceEvents: z.boolean(),
  maintenanceAlerts: z.boolean(),
  escalationEmail: z.string().trim().email().nullable().optional(),
})

const updateSecuritySettingsSchema = z.object({
  requireMfa: z.boolean(),
  passwordRotationDays: z.number().int().min(0).max(365),
  idleTimeoutMinutes: z.number().int().min(0).max(1440),
})

const TEAM_MEMBER_ROLE_VALUES = ["company_admin", "manager", "dispatcher", "driver"] as const

const updateTeamMemberSchema = z.object({
  memberId: z.string().uuid(),
  role: z.enum(TEAM_MEMBER_ROLE_VALUES),
  isActive: z.boolean(),
})

export type UpdateCompanyProfileInput = {
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  postalCode?: string | null
}

export async function updateSecuritySettings(
  input: UpdateSecuritySettingsInput,
): Promise<UpdateSecuritySettingsResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "You must be signed in to update security settings." }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, company_id")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    console.error("[settings:updateSecurity] Failed to load profile", profileError)
    return { success: false, error: "Unable to load your profile. Please try again." }
  }

  if (!profile.company_id) {
    return { success: false, error: "You are not associated with a company." }
  }

  if (!ALLOWED_ROLES.has(profile.role)) {
    return { success: false, error: "You do not have permission to update security settings." }
  }

  const parsed = updateSecuritySettingsSchema.safeParse(input)

  if (!parsed.success) {
    console.error("[settings:updateSecurity] Validation error", parsed.error.flatten())
    return { success: false, error: "Invalid security settings provided." }
  }

  const payload = parsed.data

  const { error: upsertError } = await supabase
    .from("company_security_settings")
    .upsert(
      {
        company_id: profile.company_id,
        require_mfa: payload.requireMfa,
        password_rotation_days: payload.passwordRotationDays,
        idle_timeout_minutes: payload.idleTimeoutMinutes,
      },
      { onConflict: "company_id" },
    )

  if (upsertError) {
    console.error("[settings:updateSecurity] Supabase upsert error", upsertError)
    return { success: false, error: "Failed to update security settings. Please try again." }
  }

  revalidatePath("/settings")

  return { success: true }
}

export type UpdateCompanyProfileResult = { success: true } | { success: false; error: string }

export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>

export type UpdateNotificationPreferencesResult = { success: true } | { success: false; error: string }

export type UpdateSecuritySettingsInput = z.infer<typeof updateSecuritySettingsSchema>

export type UpdateSecuritySettingsResult = { success: true } | { success: false; error: string }

export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>

export type UpdateTeamMemberResult = { success: true } | { success: false; error: string }

const ALLOWED_ROLES = new Set(["company_admin", "manager"])

export async function updateTeamMember(input: UpdateTeamMemberInput): Promise<UpdateTeamMemberResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "You must be signed in to manage team members." }
  }

  const { data: actingProfile, error: actingProfileError } = await supabase
    .from("profiles")
    .select("id, role, company_id")
    .eq("id", user.id)
    .single()

  if (actingProfileError || !actingProfile) {
    console.error("[settings:updateTeamMember] Failed to load acting profile", actingProfileError)
    return { success: false, error: "Unable to load your profile. Please try again." }
  }

  if (!actingProfile.company_id) {
    return { success: false, error: "You are not associated with a company." }
  }

  if (!ALLOWED_ROLES.has(actingProfile.role)) {
    return { success: false, error: "You do not have permission to manage team members." }
  }

  const parsed = updateTeamMemberSchema.safeParse(input)

  if (!parsed.success) {
    console.error("[settings:updateTeamMember] Validation error", parsed.error.flatten())
    return { success: false, error: "Invalid team member update provided." }
  }

  const payload = parsed.data

  const { data: targetProfile, error: targetProfileError } = await supabase
    .from("profiles")
    .select("id, role, company_id")
    .eq("id", payload.memberId)
    .single()

  if (targetProfileError || !targetProfile) {
    console.error("[settings:updateTeamMember] Failed to load target profile", targetProfileError)
    return { success: false, error: "We could not find that team member." }
  }

  if (targetProfile.company_id !== actingProfile.company_id) {
    return { success: false, error: "You can only manage team members within your company." }
  }

  if (targetProfile.role === "super_admin") {
    return { success: false, error: "Super administrators can only be managed centrally." }
  }

  if (payload.memberId === actingProfile.id && payload.isActive === false) {
    return { success: false, error: "You cannot deactivate your own account." }
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      role: payload.role,
      is_active: payload.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payload.memberId)

  if (updateError) {
    console.error("[settings:updateTeamMember] Supabase update error", updateError)
    return { success: false, error: "Failed to update team member. Please try again." }
  }

  revalidatePath("/settings")

  return { success: true }
}

export async function updateCompanyProfile(
  input: UpdateCompanyProfileInput,
): Promise<UpdateCompanyProfileResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "You must be signed in to update company settings." }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, company_id")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    console.error("[settings:updateCompany] Failed to load profile", profileError)
    return { success: false, error: "Unable to load your profile. Please try again." }
  }

  if (!profile.company_id) {
    return { success: false, error: "You are not associated with a company." }
  }

  if (!ALLOWED_ROLES.has(profile.role)) {
    return { success: false, error: "You do not have permission to update company settings." }
  }

  const sanitized = {
    name: input.name?.trim() ?? "",
    email: input.email?.trim() ? input.email.trim() : undefined,
    phone: input.phone?.trim() ? input.phone.trim() : undefined,
    address: input.address?.trim() ? input.address.trim() : undefined,
    city: input.city?.trim() ? input.city.trim() : undefined,
    country: input.country?.trim() ? input.country.trim() : undefined,
    postalCode: input.postalCode?.trim() ? input.postalCode.trim() : undefined,
  }

  const parsed = updateCompanyProfileSchema.safeParse(sanitized)

  if (!parsed.success) {
    console.error("[settings:updateCompany] Validation error", parsed.error.flatten())
    return { success: false, error: "Invalid company information provided." }
  }

  const payload = parsed.data

  const { error: updateError } = await supabase
    .from("companies")
    .update({
      name: payload.name,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      address: payload.address ?? null,
      city: payload.city ?? null,
      country: payload.country ?? null,
      postal_code: payload.postalCode ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.company_id)

  if (updateError) {
    console.error("[settings:updateCompany] Supabase update error", updateError)
    return { success: false, error: "Failed to update company details. Please try again." }
  }

  revalidatePath("/settings")

  return { success: true }
}

export async function updateNotificationPreferences(
  input: UpdateNotificationPreferencesInput,
): Promise<UpdateNotificationPreferencesResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "You must be signed in to update notification preferences." }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, company_id")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    console.error("[settings:updateNotifications] Failed to load profile", profileError)
    return { success: false, error: "Unable to load your profile. Please try again." }
  }

  if (!profile.company_id) {
    return { success: false, error: "You are not associated with a company." }
  }

  if (!ALLOWED_ROLES.has(profile.role)) {
    return { success: false, error: "You do not have permission to update notification preferences." }
  }

  const parsed = updateNotificationPreferencesSchema.safeParse(input)

  if (!parsed.success) {
    console.error("[settings:updateNotifications] Validation error", parsed.error.flatten())
    return { success: false, error: "Invalid notification preferences provided." }
  }

  const payload = parsed.data

  const { error: upsertError } = await supabase
    .from("notification_preferences")
    .upsert(
      {
        company_id: profile.company_id,
        load_updates: payload.loadUpdates,
        invoice_events: payload.invoiceEvents,
        maintenance_alerts: payload.maintenanceAlerts,
        escalation_email: payload.escalationEmail ? payload.escalationEmail.trim() : null,
      },
      { onConflict: "company_id" },
    )

  if (upsertError) {
    console.error("[settings:updateNotifications] Supabase upsert error", upsertError)
    return { success: false, error: "Failed to update notification preferences. Please try again." }
  }

  revalidatePath("/settings")

  return { success: true }
}
