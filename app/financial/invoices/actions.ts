"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

const AUTHORIZED_ROLES = new Set(["super_admin", "company_admin", "manager"])

type ActionResult = {
  success: boolean
  error?: string
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

  // Placeholder for reminder dispatch (email/SMS/etc.).
  console.info("[invoice-reminder] Reminder requested", {
    invoiceId,
    requestedBy: profile.id,
    status: invoice.status,
  })

  return { success: true }
}
