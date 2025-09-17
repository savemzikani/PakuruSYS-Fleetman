"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
// Fleet application status type
type FleetApplicationStatus = 'pending' | 'approved' | 'rejected'

// Submit fleet owner application
export async function submitFleetApplication(formData: FormData) {
  const supabase = await createClient()
  
  try {
    // Extract form data
    const company_name = formData.get('company_name') as string
    const contact_person = formData.get('contact_person') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const address = formData.get('address') as string
    const city = formData.get('city') as string
    const country = formData.get('country') as string
    const postal_code = formData.get('postal_code') as string
    const tax_number = formData.get('tax_number') as string
    const business_license = formData.get('business_license') as string
    const fleet_size = formData.get('fleet_size') ? parseInt(formData.get('fleet_size') as string) : 0
    const years_in_business = formData.get('years_in_business') ? parseInt(formData.get('years_in_business') as string) : 0
    const services_offered = formData.get('services_offered') as string
    const coverage_areas = formData.get('coverage_areas') as string
    const insurance_details = formData.get('insurance_details') as string
    const business_references = formData.get('business_references') as string
    const additional_info = formData.get('additional_info') as string

    // Validate required fields
    if (!company_name || !contact_person || !email || !phone || !country) {
      throw new Error('Company name, contact person, email, phone, and country are required')
    }

    // Check if application already exists for this email
    const { data: existingApp } = await supabase
      .from('fleet_applications')
      .select('id, status')
      .eq('email', email)
      .single()

    if (existingApp) {
      if (existingApp.status === 'pending') {
        throw new Error('An application is already pending for this email address')
      }
      if (existingApp.status === 'approved') {
        throw new Error('This email is already associated with an approved fleet')
      }
    }

    // Generate application number
    const applicationNumber = `APP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Create fleet application
    const { data: application, error } = await supabase
      .from('fleet_applications')
      .insert({
        application_number: applicationNumber,
        company_name,
        contact_person,
        email,
        phone,
        address,
        city,
        country,
        postal_code,
        tax_number,
        business_license,
        fleet_size,
        years_in_business,
        services_offered,
        coverage_areas,
        insurance_details,
        business_references,
        additional_info,
        status: 'pending' as FleetApplicationStatus,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // TODO: Send confirmation email to applicant
    // TODO: Send notification email to super admin

    return { 
      success: true, 
      data: application,
      message: `Application ${applicationNumber} submitted successfully. You will receive an email confirmation shortly.` 
    }
  } catch (error) {
    console.error('Error submitting fleet application:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to submit application' 
    }
  }
}

// Get fleet applications (super admin only)
export async function getFleetApplications(filters?: {
  status?: FleetApplicationStatus
  country?: string
  search?: string
}) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      throw new Error('Super admin access required')
    }

    // Build query
    let query = supabase
      .from('fleet_applications')
      .select(`
        *,
        reviewed_by_profile:profiles!reviewed_by(first_name, last_name)
      `)
      .order('submitted_at', { ascending: false })

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.country) {
      query = query.eq('country', filters.country)
    }
    if (filters?.search) {
      query = query.or(`company_name.ilike.%${filters.search}%,contact_person.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
    }

    const { data: applications, error } = await query

    if (error) {
      throw error
    }

    return { success: true, data: applications }
  } catch (error) {
    console.error('Error fetching fleet applications:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch applications'
    }
  }
}

// Get single fleet application (super admin only)
export async function getFleetApplication(applicationId: string) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      throw new Error('Super admin access required')
    }

    const { data: application, error } = await supabase
      .from('fleet_applications')
      .select(`
        *,
        reviewed_by_profile:profiles!reviewed_by(*)
      `)
      .eq('id', applicationId)
      .single()

    if (error) {
      throw error
    }

    return { success: true, data: application }
  } catch (error) {
    console.error('Error fetching fleet application:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch application'
    }
  }
}

// Approve fleet application
export async function approveFleetApplication(applicationId: string, notes?: string) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      throw new Error('Super admin access required')
    }

    // Get application
    const { data: application } = await supabase
      .from('fleet_applications')
      .select('*')
      .eq('id', applicationId)
      .eq('status', 'pending')
      .single()

    if (!application) {
      throw new Error('Application not found or already processed')
    }

    // Start transaction by creating company first
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: application.company_name,
        email: application.email,
        phone: application.phone,
        address: application.address,
        city: application.city,
        country: application.country,
        postal_code: application.postal_code,
        tax_number: application.tax_number,
        business_license: application.business_license,
        is_active: true,
        subscription_plan: 'basic',
        subscription_status: 'trial'
      })
      .select()
      .single()

    if (companyError) {
      throw companyError
    }

    // Create admin user profile for the company
    // Note: In a real implementation, you would send an invitation email
    // and the user would complete registration. For now, we'll create a placeholder.
    const tempPassword = Math.random().toString(36).substring(2, 15)
    
    // Create auth user (this would typically be done via invitation email)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: application.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: application.contact_person.split(' ')[0] || application.contact_person,
        last_name: application.contact_person.split(' ').slice(1).join(' ') || '',
        company_id: company.id
      }
    })

    if (authError) {
      // Rollback company creation
      await supabase.from('companies').delete().eq('id', company.id)
      throw authError
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
        company_id: company.id,
        first_name: application.contact_person.split(' ')[0] || application.contact_person,
        last_name: application.contact_person.split(' ').slice(1).join(' ') || '',
        email: application.email,
        phone: application.phone,
        role: 'company_admin',
        is_active: true
      })

    if (profileError) {
      // Rollback
      await supabase.auth.admin.deleteUser(authUser.user.id)
      await supabase.from('companies').delete().eq('id', company.id)
      throw profileError
    }

    // Update application status
    const { data: updatedApplication, error: updateError } = await supabase
      .from('fleet_applications')
      .update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: notes,
        approved_company_id: company.id
      })
      .eq('id', applicationId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // TODO: Send approval email with login credentials
    console.log(`Fleet application approved. Temporary password: ${tempPassword}`)

    revalidatePath('/admin/fleet-applications')
    return { 
      success: true, 
      data: {
        application: updatedApplication,
        company,
        tempPassword // In production, this would be sent via email
      },
      message: `Application approved and company ${company.name} created successfully` 
    }
  } catch (error) {
    console.error('Error approving fleet application:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to approve application' 
    }
  }
}

// Reject fleet application
export async function rejectFleetApplication(applicationId: string, reason: string) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      throw new Error('Super admin access required')
    }

    // Get application
    const { data: application } = await supabase
      .from('fleet_applications')
      .select('application_number, company_name, email')
      .eq('id', applicationId)
      .eq('status', 'pending')
      .single()

    if (!application) {
      throw new Error('Application not found or already processed')
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error('Rejection reason is required')
    }

    // Update application status
    const { data: updatedApplication, error } = await supabase
      .from('fleet_applications')
      .update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reason
      })
      .eq('id', applicationId)
      .select()
      .single()

    if (error) {
      throw error
    }

    // TODO: Send rejection email to applicant
    console.log(`Fleet application ${application.application_number} rejected`)

    revalidatePath('/admin/fleet-applications')
    return { 
      success: true, 
      data: updatedApplication,
      message: `Application ${application.application_number} rejected` 
    }
  } catch (error) {
    console.error('Error rejecting fleet application:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to reject application' 
    }
  }
}

// Get fleet application statistics
export async function getFleetApplicationStats() {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      throw new Error('Super admin access required')
    }

    // Get applications
    const { data: applications } = await supabase
      .from('fleet_applications')
      .select('status, country, submitted_at, fleet_size')

    if (!applications) {
      return {
        success: true,
        data: {
          totalApplications: 0,
          pendingApplications: 0,
          approvedApplications: 0,
          rejectedApplications: 0,
          byCountry: {},
          byMonth: {},
          averageFleetSize: 0
        }
      }
    }

    const stats = {
      totalApplications: applications.length,
      pendingApplications: applications.filter(a => a.status === 'pending').length,
      approvedApplications: applications.filter(a => a.status === 'approved').length,
      rejectedApplications: applications.filter(a => a.status === 'rejected').length,
      byCountry: applications.reduce((acc, a) => {
        if (a.country) {
          acc[a.country] = (acc[a.country] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>),
      byMonth: applications.reduce((acc, a) => {
        const month = new Date(a.submitted_at).toISOString().substring(0, 7) // YYYY-MM
        acc[month] = (acc[month] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      averageFleetSize: applications.reduce((sum, a) => sum + (a.fleet_size || 0), 0) / applications.length
    }

    return { success: true, data: stats }
  } catch (error) {
    console.error('Error fetching fleet application stats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch application statistics'
    }
  }
}

// Check application status by email (public)
export async function checkApplicationStatus(email: string, applicationNumber: string) {
  const supabase = await createClient()
  
  try {
    const { data: application, error } = await supabase
      .from('fleet_applications')
      .select('application_number, status, submitted_at, reviewed_at, company_name')
      .eq('email', email)
      .eq('application_number', applicationNumber)
      .single()

    if (error || !application) {
      throw new Error('Application not found')
    }

    return { 
      success: true, 
      data: {
        applicationNumber: application.application_number,
        companyName: application.company_name,
        status: application.status,
        submittedAt: application.submitted_at,
        reviewedAt: application.reviewed_at
      }
    }
  } catch (error) {
    console.error('Error checking application status:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to check application status' 
    }
  }
}
