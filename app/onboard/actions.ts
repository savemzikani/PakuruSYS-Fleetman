"use server"

import { AuthApiError } from "@supabase/supabase-js"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const onboardingSchema = z
  .object({
    companyName: z.string().trim().min(2, "Company name must be at least 2 characters"),
    registrationNumber: z.string().trim().min(2, "Registration number is required"),
    taxNumber: z.string().trim().max(100).optional().transform((value) => value || null),
    country: z.string().trim().min(1, "Country is required"),
    city: z.string().trim().min(1, "City is required"),
    address: z.string().trim().min(5, "Address is required"),
    phone: z.string().trim().min(4, "Phone number is required"),
    email: z.string().trim().email("Enter a valid company email"),
    website: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? value : null)),
    fleetSize: z.string().trim().min(1, "Select your fleet size"),
    vehicleTypes: z.array(z.string().trim()).min(1, "Select at least one vehicle type"),
    operatingRegions: z.array(z.string().trim()).min(1, "Select at least one operating region"),
    specializations: z.array(z.string().trim()).min(1, "Select at least one specialization"),
    adminFirstName: z.string().trim().min(1, "Required"),
    adminLastName: z.string().trim().min(1, "Required"),
    adminEmail: z.string().trim().email("Enter a valid email"),
    adminPhone: z.string().trim().min(4, "Phone is required"),
    adminPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters"),
  })
  .refine((data) => data.adminPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })

export type RegisterCompanyApplicationInput = z.infer<typeof onboardingSchema>
export type RegisterCompanyApplicationResult = { success: true } | { success: false; error: string }

const sanitizeWebsite = (website: string | null) => {
  if (!website) {
    return null
  }
  if (!/^https?:\/\//i.test(website)) {
    return `https://${website}`
  }
  return website
}

export async function registerCompanyApplication(
  input: RegisterCompanyApplicationInput,
): Promise<RegisterCompanyApplicationResult> {
  const parsed = onboardingSchema.safeParse(input)

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors
    const firstError = Object.values(flattened).flat()[0] ?? "Please review the highlighted fields."
    return { success: false, error: firstError }
  }

  const {
    companyName,
    registrationNumber,
    taxNumber,
    country,
    city,
    address,
    phone,
    email,
    website,
    fleetSize,
    vehicleTypes,
    operatingRegions,
    specializations,
    adminFirstName,
    adminLastName,
    adminEmail,
    adminPhone,
    adminPassword,
  } = parsed.data

  const supabase = await createClient()

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
  const redirectUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/dashboard` : undefined

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: adminEmail,
    password: adminPassword,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        first_name: adminFirstName,
        last_name: adminLastName,
        role: "company_admin",
        phone: adminPhone,
      },
    },
  })

  if (authError) {
    console.error("[onboard] supabase auth signUp error", authError)

    let errorMessage = authError.message || "Failed to register administrator account."

    if (authError instanceof AuthApiError) {
      if (authError.code === "user_already_exists") {
        errorMessage = "An administrator account with this email already exists. Try signing in or use another email."
      } else if (authError.status >= 500) {
        errorMessage = "Our authentication service is unavailable right now. Please try again shortly."
      }
    }

    return { success: false, error: errorMessage }
  }

  const adminUserId = authData.user?.id

  if (!adminUserId) {
    console.error("[onboard] signUp succeeded without user id", authData)
    return { success: false, error: "Unable to create administrator account. Please try again." }
  }

  const { error: applicationError } = await supabase.from("company_applications").insert({
    company_name: companyName,
    registration_number: registrationNumber,
    tax_number: taxNumber,
    country,
    city,
    address,
    phone,
    email,
    website: sanitizeWebsite(website),
    fleet_size: Number.parseInt(fleetSize, 10) || null,
    vehicle_types: vehicleTypes,
    operating_regions: operatingRegions,
    specializations,
    admin_user_id: adminUserId,
    status: "pending",
  })

  if (applicationError) {
    console.error("[onboard] failed to create company application", applicationError)

    const isUniqueViolation = "code" in applicationError && applicationError.code === "23505"
    const errorMessage = isUniqueViolation
      ? "We already have an application for this company. Reach out to support if you need to make changes."
      : "Could not save your company application. Please try again."

    return { success: false, error: errorMessage }
  }

  return { success: true }
}
