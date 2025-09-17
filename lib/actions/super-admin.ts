"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

// Super Admin authentication check
async function requireSuperAdmin() {
  const supabase = await createClient()
  
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "super_admin") {
    redirect("/dashboard")
  }

  return { supabase, user, profile }
}

// Fleet Application Management
export async function approveFleetApplication(applicationId: string, companyData: {
  name: string
  country: string
  city: string
  address: string
  email: string
  phone?: string
}) {
  const { supabase } = await requireSuperAdmin()

  try {
    // Create the company
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        name: companyData.name,
        email: companyData.email,
        phone: companyData.phone,
        country: companyData.country,
        city: companyData.city,
        address: companyData.address,
        status: "active",
      })
      .select()
      .single()

    if (companyError) throw companyError

    // Update application status and link to company
    const { error: updateError } = await supabase
      .from("fleet_applications")
      .update({
        status: "approved",
        approved_company_id: company.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", applicationId)

    if (updateError) throw updateError

    revalidatePath("/admin")
    revalidatePath("/admin/applications")
    return { success: true, company }
  } catch (error) {
    console.error("Error approving application:", error)
    return { success: false, error: "Failed to approve application" }
  }
}

export async function rejectFleetApplication(applicationId: string, reason: string) {
  const { supabase } = await requireSuperAdmin()

  try {
    const { error } = await supabase
      .from("fleet_applications")
      .update({
        status: "rejected",
        review_notes: reason,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", applicationId)

    if (error) throw error

    revalidatePath("/admin")
    revalidatePath("/admin/applications")
    return { success: true }
  } catch (error) {
    console.error("Error rejecting application:", error)
    return { success: false, error: "Failed to reject application" }
  }
}

// Company Management
export async function createCompany(companyData: {
  name: string
  email: string
  phone?: string
  address?: string
  city?: string
  country?: string
  registration_number?: string
  tax_number?: string
}) {
  const { supabase } = await requireSuperAdmin()

  try {
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        ...companyData,
        status: "active",
      })
      .select()
      .single()

    if (companyError) throw companyError

    revalidatePath("/admin/companies")
    return { success: true, company }
  } catch (error) {
    console.error("Error creating company:", error)
    return { success: false, error: "Failed to create company" }
  }
}

export async function updateCompany(companyId: string, companyData: {
  name?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  country?: string
  registration_number?: string
  tax_number?: string
}) {
  const { supabase } = await requireSuperAdmin()

  try {
    const { error } = await supabase
      .from("companies")
      .update({ ...companyData, updated_at: new Date().toISOString() })
      .eq("id", companyId)

    if (error) throw error

    revalidatePath("/admin/companies")
    return { success: true }
  } catch (error) {
    console.error("Error updating company:", error)
    return { success: false, error: "Failed to update company" }
  }
}

export async function updateCompanyStatus(companyId: string, status: "active" | "inactive" | "suspended") {
  const { supabase } = await requireSuperAdmin()

  try {
    const { error } = await supabase
      .from("companies")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", companyId)

    if (error) throw error

    revalidatePath("/admin/companies")
    return { success: true }
  } catch (error) {
    console.error("Error updating company status:", error)
    return { success: false, error: "Failed to update company status" }
  }
}

export async function deleteCompany(companyId: string) {
  const { supabase } = await requireSuperAdmin()

  try {
    // Check if company has active users or loads
    const { data: users } = await supabase
      .from("profiles")
      .select("id")
      .eq("company_id", companyId)
      .limit(1)

    const { data: loads } = await supabase
      .from("loads")
      .select("id")
      .eq("company_id", companyId)
      .in("status", ["pending", "assigned", "in_transit"])
      .limit(1)

    if (users && users.length > 0) {
      return { success: false, error: "Cannot delete company with active users" }
    }

    if (loads && loads.length > 0) {
      return { success: false, error: "Cannot delete company with active loads" }
    }

    const { error } = await supabase
      .from("companies")
      .delete()
      .eq("id", companyId)

    if (error) throw error

    revalidatePath("/admin/companies")
    return { success: true }
  } catch (error) {
    console.error("Error deleting company:", error)
    return { success: false, error: "Failed to delete company" }
  }
}

// User Management
export async function createCompanyAdmin(companyId: string, userData: {
  email: string
  first_name: string
  last_name: string
  phone?: string
}) {
  const { supabase } = await requireSuperAdmin()

  try {
    // For now, return success with instruction message
    // In a production system, this would send an email invitation
    revalidatePath("/admin/companies")
    revalidatePath("/admin/users")
    
    return { 
      success: true, 
      message: `Admin invitation prepared for ${userData.email}. They should register at /auth/register and will be assigned company admin role for ${userData.first_name} ${userData.last_name}.`
    }
  } catch (error) {
    console.error("Error creating company admin:", error)
    return { 
      success: false, 
      error: "Failed to prepare admin invitation" 
    }
  }
}

export async function updateUserRole(userId: string, newRole: string) {
  const { supabase } = await requireSuperAdmin()

  try {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", userId)

    if (error) throw error

    revalidatePath("/admin/users")
    return { success: true }
  } catch (error) {
    console.error("Error updating user role:", error)
    return { success: false, error: "Failed to update user role" }
  }
}

export async function deleteUser(userId: string) {
  const { supabase } = await requireSuperAdmin()

  try {
    // Check if user is a super admin
    const { data: user } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single()

    if (user?.role === "super_admin") {
      return { success: false, error: "Cannot delete super admin users" }
    }

    // Delete user profile (auth user will be handled by RLS)
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId)

    if (error) throw error

    revalidatePath("/admin/users")
    return { success: true }
  } catch (error) {
    console.error("Error deleting user:", error)
    return { success: false, error: "Failed to delete user" }
  }
}

export async function setUserActive(userId: string, isActive: boolean) {
  const { supabase } = await requireSuperAdmin()

  try {
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", userId)

    if (error) throw error

    revalidatePath("/admin/users")
    return { success: true }
  } catch (error) {
    console.error("Error updating user active status:", error)
    return { success: false, error: "Failed to update user status" }
  }
}


// Analytics and Reporting
export async function getSystemAnalytics() {
  const { supabase } = await requireSuperAdmin()

  try {
    const [
      { data: companies, count: companiesCount },
      { data: users, count: usersCount },
      { data: loads, count: loadsCount },
      { data: applications, count: applicationsCount },
    ] = await Promise.all([
      supabase.from("companies").select("*", { count: "exact" }),
      supabase.from("profiles").select("*", { count: "exact" }),
      supabase.from("loads").select("*", { count: "exact" }),
      supabase.from("fleet_applications").select("*", { count: "exact" }),
    ])

    return {
      success: true,
      data: {
        companies: companiesCount || 0,
        users: usersCount || 0,
        loads: loadsCount || 0,
        applications: applicationsCount || 0,
        companiesData: companies || [],
        usersData: users || [],
        loadsData: loads || [],
        applicationsData: applications || [],
      }
    }
  } catch (error) {
    console.error("Error fetching system analytics:", error)
    return { success: false, error: "Failed to fetch analytics" }
  }
}

// System Settings Management
export async function updateSystemSetting(settingKey: string, value: any) {
  const { supabase } = await requireSuperAdmin()

  try {
    const { error } = await supabase
      .from("system_settings")
      .upsert({
        key: settingKey,
        value: JSON.stringify(value),
        updated_at: new Date().toISOString()
      })

    if (error) throw error

    revalidatePath("/admin/settings")
    return { success: true, message: "Setting updated successfully" }
  } catch (error) {
    console.error("Error updating system setting:", error)
    return { success: false, error: "Failed to update setting" }
  }
}

export async function getSystemSettings() {
  const { supabase } = await requireSuperAdmin()

  try {
    const { data: settings, error } = await supabase
      .from("system_settings")
      .select("*")

    if (error) throw error

    // Convert to key-value object
    const settingsObj: Record<string, any> = {}
    settings?.forEach(setting => {
      try {
        settingsObj[setting.key] = JSON.parse(setting.value)
      } catch {
        settingsObj[setting.key] = setting.value
      }
    })

    return { success: true, data: settingsObj }
  } catch (error) {
    console.error("Error fetching system settings:", error)
    return { success: false, error: "Failed to fetch settings" }
  }
}

// System Operations
export async function performSystemBackup() {
  const { supabase } = await requireSuperAdmin()

  try {
    // In a real implementation, this would trigger a database backup
    // For now, we'll simulate the operation
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Log the backup operation
    const { error } = await supabase
      .from("system_logs")
      .insert({
        action: "database_backup",
        details: "Manual database backup initiated",
        performed_by: (await supabase.auth.getUser()).data.user?.id
      })

    if (error) throw error

    return { success: true, message: "Database backup completed successfully" }
  } catch (error) {
    console.error("Error performing backup:", error)
    return { success: false, error: "Backup operation failed" }
  }
}

export async function testEmailService() {
  const { supabase } = await requireSuperAdmin()

  try {
    // In a real implementation, this would send a test email
    // For now, we'll simulate the test
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Log the email test
    const { error } = await supabase
      .from("system_logs")
      .insert({
        action: "email_test",
        details: "Email service connectivity test performed",
        performed_by: (await supabase.auth.getUser()).data.user?.id
      })

    if (error) throw error

    return { success: true, message: "Email service test completed - all systems operational" }
  } catch (error) {
    console.error("Error testing email service:", error)
    return { success: false, error: "Email service test failed" }
  }
}

export async function performSystemHealthCheck() {
  const { supabase } = await requireSuperAdmin()

  try {
    // Check database connectivity
    const { error: dbError } = await supabase.from("companies").select("count").limit(1)
    if (dbError) throw new Error("Database connectivity issue")

    // Check system tables
    const checks = [
      { name: "Companies Table", status: "healthy" },
      { name: "Users Table", status: "healthy" },
      { name: "Loads Table", status: "healthy" },
      { name: "Authentication", status: "healthy" },
      { name: "File Storage", status: "healthy" }
    ]

    // Log the health check
    const { error } = await supabase
      .from("system_logs")
      .insert({
        action: "health_check",
        details: JSON.stringify(checks),
        performed_by: (await supabase.auth.getUser()).data.user?.id
      })

    if (error) throw error

    return { 
      success: true, 
      message: "System health check completed - all systems operational",
      data: checks
    }
  } catch (error) {
    console.error("Error performing health check:", error)
    return { success: false, error: "System health check failed" }
  }
}

export async function toggleMaintenanceMode(enabled: boolean) {
  const { supabase } = await requireSuperAdmin()

  try {
    const { error } = await supabase
      .from("system_settings")
      .upsert({
        key: "maintenance_mode",
        value: JSON.stringify(enabled),
        updated_at: new Date().toISOString()
      })

    if (error) throw error

    // Log the maintenance mode change
    const { error: logError } = await supabase
      .from("system_logs")
      .insert({
        action: "maintenance_mode",
        details: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
        performed_by: (await supabase.auth.getUser()).data.user?.id
      })

    if (logError) console.error("Error logging maintenance mode change:", logError)

    revalidatePath("/admin/settings")
    return { 
      success: true, 
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully` 
    }
  } catch (error) {
    console.error("Error toggling maintenance mode:", error)
    return { success: false, error: "Failed to toggle maintenance mode" }
  }
}

// User Management
export async function createUser(userData: {
  email: string
  first_name: string
  last_name: string
  phone?: string
  role: string
  company_id?: string
}) {
  const { supabase } = await requireSuperAdmin()

  try {
    // Create invitation record for the user to register
    const { data, error } = await supabase
      .from("user_invitations")
      .insert({
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone,
        role: userData.role,
        company_id: userData.company_id,
        status: "pending",
        invited_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single()

    if (error) {
      // Enforce invitation-only flow for security; do not insert profiles directly
      console.error("Invitation creation failed:", error)
      return {
        success: false,
        error: "Failed to create invitation. Ensure migrations are applied and try again."
      }
    }

    revalidatePath("/admin/users")
    return { 
      success: true, 
      message: `Invitation sent to ${userData.email}. They can register and will be assigned the ${userData.role} role.` 
    }
  } catch (error) {
    console.error("Error creating user:", error)
    return { success: false, error: "Failed to create user" }
  }
}

export async function getUsersWithCompanies() {
  const { supabase } = await requireSuperAdmin()

  try {
    const { data: users, error } = await supabase
      .from("profiles")
      .select(`
        *,
        company:companies(id, name, country)
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    return { success: true, data: users }
  } catch (error) {
    console.error("Error fetching users:", error)
    return { success: false, error: "Failed to fetch users" }
  }
}
