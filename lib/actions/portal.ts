"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Quote, Invoice, Load } from "@/lib/types/database"

// Customer portal authentication
export async function authenticateCustomerPortal(email: string, customerId: string) {
  const supabase = await createClient()
  
  try {
    // Verify customer exists and is active
    const { data: customer, error } = await supabase
      .from('customers')
      .select(`
        *,
        company:companies(*)
      `)
      .eq('id', customerId)
      .eq('email', email)
      .eq('is_active', true)
      .single()

    if (error || !customer) {
      throw new Error('Invalid customer credentials or inactive account')
    }

    return {
      success: true,
      data: {
        customer,
        company: customer.company
      }
    }
  } catch (error) {
    console.error('Error authenticating customer portal:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed'
    }
  }
}

// Get customer dashboard data
export async function getCustomerDashboard(customerId: string) {
  const supabase = await createClient()
  
  try {
    // Get customer with related data
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, company_id')
      .eq('id', customerId)
      .eq('is_active', true)
      .single()

    if (!customer) {
      throw new Error('Customer not found')
    }

    // Get dashboard statistics
    const [
      { data: loads },
      { data: quotes },
      { data: invoices }
    ] = await Promise.all([
      supabase
        .from('loads')
        .select('id, status, rate, currency')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('quotes')
        .select('id, status, total_amount, currency')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('invoices')
        .select('id, status, total_amount, currency, due_date')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(5)
    ])

    // Calculate statistics
    const stats = {
      totalLoads: loads?.length || 0,
      activeLoads: loads?.filter(l => ['pending', 'assigned', 'in_transit'].includes(l.status)).length || 0,
      completedLoads: loads?.filter(l => l.status === 'delivered').length || 0,
      pendingQuotes: quotes?.filter(q => q.status === 'sent').length || 0,
      acceptedQuotes: quotes?.filter(q => q.status === 'accepted').length || 0,
      pendingInvoices: invoices?.filter(i => i.status === 'pending').length || 0,
      overdueInvoices: invoices?.filter(i => {
        return i.status === 'pending' && new Date(i.due_date) < new Date()
      }).length || 0,
      totalOutstanding: invoices?.filter(i => i.status === 'pending')
        .reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0
    }

    return {
      success: true,
      data: {
        customer,
        stats,
        recentLoads: loads || [],
        recentQuotes: quotes || [],
        recentInvoices: invoices || []
      }
    }
  } catch (error) {
    console.error('Error fetching customer dashboard:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch dashboard data'
    }
  }
}

// Get customer quotes
export async function getCustomerQuotes(customerId: string, status?: string) {
  const supabase = await createClient()
  
  try {
    // Verify customer access
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('is_active', true)
      .single()

    if (!customer) {
      throw new Error('Customer not found')
    }

    // Build query
    let query = supabase
      .from('quotes')
      .select(`
        *,
        quote_items(*),
        load:loads(load_number, pickup_city, delivery_city),
        company:companies(name, email, phone)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: quotes, error } = await query

    if (error) {
      throw error
    }

    return { success: true, data: quotes }
  } catch (error) {
    console.error('Error fetching customer quotes:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch quotes'
    }
  }
}

// Customer accept quote
export async function customerAcceptQuote(quoteId: string, customerId: string) {
  const supabase = await createClient()
  
  try {
    // Verify quote belongs to customer and is in sent status
    const { data: quote } = await supabase
      .from('quotes')
      .select('id, quote_number, status, valid_until')
      .eq('id', quoteId)
      .eq('customer_id', customerId)
      .eq('status', 'sent')
      .single()

    if (!quote) {
      throw new Error('Quote not found or cannot be accepted')
    }

    // Check if quote is still valid
    if (new Date(quote.valid_until) < new Date()) {
      throw new Error('Quote has expired')
    }

    // Accept quote
    const { data: updatedQuote, error } = await supabase
      .from('quotes')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', quoteId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return {
      success: true,
      data: updatedQuote,
      message: `Quote ${quote.quote_number} accepted successfully`
    }
  } catch (error) {
    console.error('Error accepting quote:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to accept quote'
    }
  }
}

// Customer reject quote
export async function customerRejectQuote(quoteId: string, customerId: string, reason?: string) {
  const supabase = await createClient()
  
  try {
    // Verify quote belongs to customer and is in sent status
    const { data: quote } = await supabase
      .from('quotes')
      .select('id, quote_number, status')
      .eq('id', quoteId)
      .eq('customer_id', customerId)
      .eq('status', 'sent')
      .single()

    if (!quote) {
      throw new Error('Quote not found or cannot be rejected')
    }

    // Reject quote
    const { data: updatedQuote, error } = await supabase
      .from('quotes')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        notes: reason ? `Customer rejection reason: ${reason}` : 'Rejected by customer'
      })
      .eq('id', quoteId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return {
      success: true,
      data: updatedQuote,
      message: `Quote ${quote.quote_number} rejected`
    }
  } catch (error) {
    console.error('Error rejecting quote:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject quote'
    }
  }
}

// Get customer invoices
export async function getCustomerInvoices(customerId: string, status?: string) {
  const supabase = await createClient()
  
  try {
    // Verify customer access
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('is_active', true)
      .single()

    if (!customer) {
      throw new Error('Customer not found')
    }

    // Build query
    let query = supabase
      .from('invoices')
      .select(`
        *,
        load:loads(load_number, pickup_city, delivery_city),
        company:companies(name, email, phone, address)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: invoices, error } = await query

    if (error) {
      throw error
    }

    return { success: true, data: invoices }
  } catch (error) {
    console.error('Error fetching customer invoices:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch invoices'
    }
  }
}

// Get customer loads/shipments
export async function getCustomerLoads(customerId: string, status?: string) {
  const supabase = await createClient()
  
  try {
    // Verify customer access
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('is_active', true)
      .single()

    if (!customer) {
      throw new Error('Customer not found')
    }

    // Build query
    let query = supabase
      .from('loads')
      .select(`
        *,
        vehicle:vehicles(registration_number, make, model),
        driver:drivers(first_name, last_name, phone),
        tracking:load_tracking(*),
        company:companies(name, phone, email)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: loads, error } = await query

    if (error) {
      throw error
    }

    return { success: true, data: loads }
  } catch (error) {
    console.error('Error fetching customer loads:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch loads'
    }
  }
}

// Submit load request from customer portal
export async function submitLoadRequest(customerId: string, formData: FormData) {
  const supabase = await createClient()
  
  try {
    // Verify customer access
    const { data: customer } = await supabase
      .from('customers')
      .select('id, company_id, name')
      .eq('id', customerId)
      .eq('is_active', true)
      .single()

    if (!customer) {
      throw new Error('Customer not found')
    }

    // Extract form data
    const description = formData.get('description') as string
    const weight_kg = formData.get('weight_kg') ? parseFloat(formData.get('weight_kg') as string) : null
    const volume_m3 = formData.get('volume_m3') ? parseFloat(formData.get('volume_m3') as string) : null
    const pickup_address = formData.get('pickup_address') as string
    const pickup_city = formData.get('pickup_city') as string
    const pickup_country = formData.get('pickup_country') as string
    const pickup_date = formData.get('pickup_date') as string
    const delivery_address = formData.get('delivery_address') as string
    const delivery_city = formData.get('delivery_city') as string
    const delivery_country = formData.get('delivery_country') as string
    const delivery_date = formData.get('delivery_date') as string
    const special_instructions = formData.get('special_instructions') as string

    // Generate load number
    const { data: loadNumber } = await supabase
      .rpc('generate_load_number', { company_uuid: customer.company_id })

    // Create load request
    const { data: load, error } = await supabase
      .from('loads')
      .insert({
        company_id: customer.company_id,
        customer_id: customerId,
        load_number: loadNumber,
        description,
        weight_kg,
        volume_m3,
        pickup_address,
        pickup_city,
        pickup_country,
        pickup_date: pickup_date || null,
        delivery_address,
        delivery_city,
        delivery_country,
        delivery_date: delivery_date || null,
        status: 'pending',
        currency: 'USD',
        special_instructions
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return {
      success: true,
      data: load,
      message: `Load request ${load.load_number} submitted successfully`
    }
  } catch (error) {
    console.error('Error submitting load request:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit load request'
    }
  }
}

// Get customer profile
export async function getCustomerProfile(customerId: string) {
  const supabase = await createClient()
  
  try {
    const { data: customer, error } = await supabase
      .from('customers')
      .select(`
        *,
        company:companies(name, email, phone)
      `)
      .eq('id', customerId)
      .eq('is_active', true)
      .single()

    if (error || !customer) {
      throw new Error('Customer not found')
    }

    return { success: true, data: customer }
  } catch (error) {
    console.error('Error fetching customer profile:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch profile'
    }
  }
}

// Update customer profile (limited fields)
export async function updateCustomerProfile(customerId: string, formData: FormData) {
  const supabase = await createClient()
  
  try {
    // Verify customer exists
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('is_active', true)
      .single()

    if (!existingCustomer) {
      throw new Error('Customer not found')
    }

    // Extract allowed fields for customer self-update
    const contact_person = formData.get('contact_person') as string
    const phone = formData.get('phone') as string
    const address = formData.get('address') as string
    const city = formData.get('city') as string
    const postal_code = formData.get('postal_code') as string

    // Update customer profile
    const { data: customer, error } = await supabase
      .from('customers')
      .update({
        contact_person,
        phone,
        address,
        city,
        postal_code,
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return {
      success: true,
      data: customer,
      message: 'Profile updated successfully'
    }
  } catch (error) {
    console.error('Error updating customer profile:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update profile'
    }
  }
}

// Get customer payment history
export async function getCustomerPaymentHistory(customerId: string) {
  const supabase = await createClient()
  
  try {
    // Verify customer access
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('is_active', true)
      .single()

    if (!customer) {
      throw new Error('Customer not found')
    }

    // Get paid invoices as payment history
    const { data: payments, error } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        total_amount,
        currency,
        paid_date,
        issue_date,
        load:loads(load_number)
      `)
      .eq('customer_id', customerId)
      .eq('status', 'paid')
      .order('paid_date', { ascending: false })

    if (error) {
      throw error
    }

    return { success: true, data: payments || [] }
  } catch (error) {
    console.error('Error fetching payment history:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch payment history'
    }
  }
}
