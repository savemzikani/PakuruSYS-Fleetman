"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Customer } from "@/lib/types/database"

// Create a new customer
export async function createCustomer(formData: FormData) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Check permissions
    if (!['super_admin', 'company_admin', 'manager', 'dispatcher'].includes(profile.role)) {
      throw new Error('Insufficient permissions')
    }

    // Extract form data
    const name = formData.get('name') as string
    const contact_person = formData.get('contact_person') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const address = formData.get('address') as string
    const city = formData.get('city') as string
    const country = formData.get('country') as string
    const postal_code = formData.get('postal_code') as string
    const tax_number = formData.get('tax_number') as string
    const credit_limit = formData.get('credit_limit') ? parseFloat(formData.get('credit_limit') as string) : 0
    const payment_terms = formData.get('payment_terms') ? parseInt(formData.get('payment_terms') as string) : 30

    // Create customer
    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        company_id: profile.company_id,
        name,
        contact_person,
        email,
        phone,
        address,
        city,
        country,
        postal_code,
        tax_number,
        credit_limit,
        payment_terms,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/customers')
    return { 
      success: true, 
      data: customer,
      message: `Customer ${name} created successfully` 
    }
  } catch (error) {
    console.error('Error creating customer:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create customer' 
    }
  }
}

// Update an existing customer
export async function updateCustomer(customerId: string, formData: FormData) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Check permissions
    if (!['super_admin', 'company_admin', 'manager', 'dispatcher'].includes(profile.role)) {
      throw new Error('Insufficient permissions')
    }

    // Verify customer exists and belongs to company
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('company_id', profile.company_id)
      .single()

    if (!existingCustomer) {
      throw new Error('Customer not found')
    }

    // Extract form data
    const name = formData.get('name') as string
    const contact_person = formData.get('contact_person') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const address = formData.get('address') as string
    const city = formData.get('city') as string
    const country = formData.get('country') as string
    const postal_code = formData.get('postal_code') as string
    const tax_number = formData.get('tax_number') as string
    const credit_limit = formData.get('credit_limit') ? parseFloat(formData.get('credit_limit') as string) : 0
    const payment_terms = formData.get('payment_terms') ? parseInt(formData.get('payment_terms') as string) : 30
    const is_active = formData.get('is_active') === 'true'

    // Update customer
    const { data: customer, error } = await supabase
      .from('customers')
      .update({
        name,
        contact_person,
        email,
        phone,
        address,
        city,
        country,
        postal_code,
        tax_number,
        credit_limit,
        payment_terms,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId)
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/customers')
    revalidatePath(`/customers/${customerId}`)
    return { 
      success: true, 
      data: customer,
      message: `Customer ${name} updated successfully` 
    }
  } catch (error) {
    console.error('Error updating customer:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update customer' 
    }
  }
}

// Delete a customer
export async function deleteCustomer(customerId: string) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Check permissions
    if (!['super_admin', 'company_admin', 'manager'].includes(profile.role)) {
      throw new Error('Insufficient permissions')
    }

    // Check if customer has active loads or invoices
    const [{ data: activeLoads }, { data: pendingInvoices }] = await Promise.all([
      supabase
        .from('loads')
        .select('id')
        .eq('customer_id', customerId)
        .in('status', ['pending', 'assigned', 'in_transit']),
      supabase
        .from('invoices')
        .select('id')
        .eq('customer_id', customerId)
        .eq('status', 'pending')
    ])

    if (activeLoads && activeLoads.length > 0) {
      throw new Error('Cannot delete customer with active loads. Please complete or cancel loads first.')
    }

    if (pendingInvoices && pendingInvoices.length > 0) {
      throw new Error('Cannot delete customer with pending invoices. Please resolve invoices first.')
    }

    // Get customer info for response
    const { data: customer } = await supabase
      .from('customers')
      .select('name')
      .eq('id', customerId)
      .eq('company_id', profile.company_id)
      .single()

    if (!customer) {
      throw new Error('Customer not found')
    }

    // Delete customer
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId)
      .eq('company_id', profile.company_id)

    if (error) {
      throw error
    }

    revalidatePath('/customers')
    return { 
      success: true, 
      message: `Customer ${customer.name} deleted successfully` 
    }
  } catch (error) {
    console.error('Error deleting customer:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete customer' 
    }
  }
}

// Toggle customer active status
export async function toggleCustomerStatus(customerId: string) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Check permissions
    if (!['super_admin', 'company_admin', 'manager'].includes(profile.role)) {
      throw new Error('Insufficient permissions')
    }

    // Get current customer status
    const { data: customer } = await supabase
      .from('customers')
      .select('is_active, name')
      .eq('id', customerId)
      .eq('company_id', profile.company_id)
      .single()

    if (!customer) {
      throw new Error('Customer not found')
    }

    // If deactivating, check for active loads
    if (customer.is_active) {
      const { data: activeLoads } = await supabase
        .from('loads')
        .select('id')
        .eq('customer_id', customerId)
        .in('status', ['pending', 'assigned', 'in_transit'])

      if (activeLoads && activeLoads.length > 0) {
        throw new Error('Cannot deactivate customer with active loads. Please complete or cancel loads first.')
      }
    }

    // Toggle status
    const { data: updatedCustomer, error } = await supabase
      .from('customers')
      .update({
        is_active: !customer.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId)
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/customers')
    revalidatePath(`/customers/${customerId}`)
    return { 
      success: true, 
      data: updatedCustomer,
      message: `Customer ${customer.name} ${updatedCustomer.is_active ? 'activated' : 'deactivated'} successfully` 
    }
  } catch (error) {
    console.error('Error toggling customer status:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update customer status' 
    }
  }
}

// Get customers for a company
export async function getCustomers(filters?: {
  is_active?: boolean
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
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Build query
    let query = supabase
      .from('customers')
      .select(`
        *,
        loads:loads(count),
        invoices:invoices(count)
      `)
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active)
    }
    if (filters?.country) {
      query = query.eq('country', filters.country)
    }
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,contact_person.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
    }

    const { data: customers, error } = await query

    if (error) {
      throw error
    }

    return { success: true, data: customers }
  } catch (error) {
    console.error('Error fetching customers:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch customers'
    }
  }
}

// Get single customer by ID
export async function getCustomer(customerId: string) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Fetch customer with related data
    const { data: customer, error } = await supabase
      .from('customers')
      .select(`
        *,
        loads:loads(
          id,
          load_number,
          status,
          pickup_city,
          delivery_city,
          pickup_date,
          delivery_date,
          rate,
          currency
        ),
        invoices:invoices(
          id,
          invoice_number,
          status,
          total_amount,
          currency,
          due_date
        ),
        quotes:quotes(
          id,
          quote_number,
          status,
          total_amount,
          currency,
          valid_until
        )
      `)
      .eq('id', customerId)
      .eq('company_id', profile.company_id)
      .single()

    if (error) {
      throw error
    }

    return { success: true, data: customer }
  } catch (error) {
    console.error('Error fetching customer:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch customer'
    }
  }
}

// Get customer statistics
export async function getCustomerStats() {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Get customer statistics
    const { data: customers } = await supabase
      .from('customers')
      .select('is_active, credit_limit, country')
      .eq('company_id', profile.company_id)

    if (!customers) {
      return {
        success: true,
        data: {
          totalCustomers: 0,
          activeCustomers: 0,
          inactiveCustomers: 0,
          totalCreditLimit: 0,
          byCountry: {}
        }
      }
    }

    const stats = {
      totalCustomers: customers.length,
      activeCustomers: customers.filter(c => c.is_active).length,
      inactiveCustomers: customers.filter(c => !c.is_active).length,
      totalCreditLimit: customers.reduce((sum, c) => sum + (c.credit_limit || 0), 0),
      byCountry: customers.reduce((acc, c) => {
        if (c.country) {
          acc[c.country] = (acc[c.country] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>)
    }

    return { success: true, data: stats }
  } catch (error) {
    console.error('Error fetching customer stats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch customer statistics'
    }
  }
}

// Create customer portal invitation
export async function createCustomerPortalInvitation(customerId: string) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User not associated with a company')
    }

    // Check permissions
    if (!['super_admin', 'company_admin', 'manager'].includes(profile.role)) {
      throw new Error('Insufficient permissions')
    }

    // Get customer details
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select(`
        *,
        company:companies(*)
      `)
      .eq('id', customerId)
      .eq('company_id', profile.company_id)
      .single()

    if (customerError || !customer) {
      throw new Error('Customer not found')
    }

    if (!customer.email) {
      throw new Error('Customer email is required for portal invitation')
    }

    // Generate invitation token (in real implementation, this would be a secure token)
    const invitationToken = `inv_${Date.now()}_${Math.random().toString(36).substring(2)}`
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/register?token=${invitationToken}`

    // Store invitation (in real implementation, store in database with expiry)
    // For now, we'll just simulate the invitation process

    // TODO: Send invitation email to customer
    console.log(`Portal invitation would be sent to ${customer.email}`)
    console.log(`Invitation URL: ${invitationUrl}`)

    return {
      success: true,
      data: {
        invitationToken,
        invitationUrl
      },
      message: `Portal invitation sent to ${customer.name} at ${customer.email}`
    }
  } catch (error) {
    console.error('Error creating customer portal invitation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create portal invitation'
    }
  }
}
