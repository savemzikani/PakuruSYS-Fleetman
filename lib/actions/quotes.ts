"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { Quote, QuoteItem, QuoteStatus } from "@/lib/types/database"

// Create a new quote
export async function createQuote(formData: FormData) {
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
    const customer_id = formData.get('customer_id') as string
    const load_id = formData.get('load_id') as string
    const quote_date = formData.get('quote_date') as string
    const valid_until = formData.get('valid_until') as string
    const subtotal = parseFloat(formData.get('subtotal') as string)
    const tax_amount = parseFloat(formData.get('tax_amount') as string) || 0
    const total_amount = parseFloat(formData.get('total_amount') as string)
    const currency = formData.get('currency') as string
    const notes = formData.get('notes') as string
    const terms = formData.get('terms') as string

    // Generate quote number
    const { data: quoteNumber } = await supabase
      .rpc('generate_quote_number', { company_uuid: profile.company_id })

    // Create quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        company_id: profile.company_id,
        customer_id,
        load_id: load_id || null,
        quote_number: quoteNumber,
        quote_date,
        valid_until,
        subtotal,
        tax_amount,
        total_amount,
        currency,
        status: 'draft' as QuoteStatus,
        notes,
        terms,
        created_by: user.id
      })
      .select()
      .single()

    if (quoteError) {
      throw quoteError
    }

    // Process quote items
    const itemsData = formData.get('items') as string
    if (itemsData) {
      const items = JSON.parse(itemsData)
      const quoteItems = items.map((item: any, index: number) => ({
        quote_id: quote.id,
        description: item.description,
        quantity: parseFloat(item.quantity),
        unit_price: parseFloat(item.unit_price),
        line_total: parseFloat(item.line_total),
        sort_order: index + 1
      }))

      const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(quoteItems)

      if (itemsError) {
        throw itemsError
      }
    }

    revalidatePath('/quotes')
    return { 
      success: true, 
      data: quote,
      message: `Quote ${quote.quote_number} created successfully` 
    }
  } catch (error) {
    console.error('Error creating quote:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create quote' 
    }
  }
}

// Update an existing quote
export async function updateQuote(quoteId: string, formData: FormData) {
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

    // Verify quote exists and belongs to company
    const { data: existingQuote } = await supabase
      .from('quotes')
      .select('id, status')
      .eq('id', quoteId)
      .eq('company_id', profile.company_id)
      .single()

    if (!existingQuote) {
      throw new Error('Quote not found')
    }

    // Only allow editing draft or sent quotes
    if (!['draft', 'sent'].includes(existingQuote.status)) {
      throw new Error('Cannot edit quote with current status')
    }

    // Extract form data
    const customer_id = formData.get('customer_id') as string
    const load_id = formData.get('load_id') as string
    const quote_date = formData.get('quote_date') as string
    const valid_until = formData.get('valid_until') as string
    const subtotal = parseFloat(formData.get('subtotal') as string)
    const tax_amount = parseFloat(formData.get('tax_amount') as string) || 0
    const total_amount = parseFloat(formData.get('total_amount') as string)
    const currency = formData.get('currency') as string
    const notes = formData.get('notes') as string
    const terms = formData.get('terms') as string

    // Update quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .update({
        customer_id,
        load_id: load_id || null,
        quote_date,
        valid_until,
        subtotal,
        tax_amount,
        total_amount,
        currency,
        notes,
        terms,
        updated_at: new Date().toISOString()
      })
      .eq('id', quoteId)
      .select()
      .single()

    if (quoteError) {
      throw quoteError
    }

    // Update quote items
    const itemsData = formData.get('items') as string
    if (itemsData) {
      // Delete existing items
      await supabase
        .from('quote_items')
        .delete()
        .eq('quote_id', quoteId)

      // Insert new items
      const items = JSON.parse(itemsData)
      const quoteItems = items.map((item: any, index: number) => ({
        quote_id: quoteId,
        description: item.description,
        quantity: parseFloat(item.quantity),
        unit_price: parseFloat(item.unit_price),
        line_total: parseFloat(item.line_total),
        sort_order: index + 1
      }))

      const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(quoteItems)

      if (itemsError) {
        throw itemsError
      }
    }

    revalidatePath('/quotes')
    revalidatePath(`/quotes/${quoteId}`)
    return { 
      success: true, 
      data: quote,
      message: `Quote ${quote.quote_number} updated successfully` 
    }
  } catch (error) {
    console.error('Error updating quote:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update quote' 
    }
  }
}

// Delete a quote
export async function deleteQuote(quoteId: string) {
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

    // Verify quote exists and can be deleted
    const { data: quote } = await supabase
      .from('quotes')
      .select('id, status, quote_number')
      .eq('id', quoteId)
      .eq('company_id', profile.company_id)
      .single()

    if (!quote) {
      throw new Error('Quote not found')
    }

    // Only allow deleting draft quotes
    if (quote.status !== 'draft') {
      throw new Error('Can only delete draft quotes')
    }

    // Delete quote (cascade will handle quote_items)
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', quoteId)

    if (error) {
      throw error
    }

    revalidatePath('/quotes')
    return { 
      success: true, 
      message: `Quote ${quote.quote_number} deleted successfully` 
    }
  } catch (error) {
    console.error('Error deleting quote:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete quote' 
    }
  }
}

// Send quote to customer
export async function sendQuote(quoteId: string) {
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

    // Get quote with customer details
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('id', quoteId)
      .eq('company_id', profile.company_id)
      .single()

    if (quoteError || !quote) {
      throw new Error('Quote not found')
    }

    if (quote.status !== 'draft') {
      throw new Error('Only draft quotes can be sent')
    }

    // Update quote status
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        status: 'sent' as QuoteStatus,
        sent_at: new Date().toISOString()
      })
      .eq('id', quoteId)

    if (updateError) {
      throw updateError
    }

    // TODO: Send email notification to customer
    // This would integrate with the email system when implemented

    revalidatePath('/quotes')
    revalidatePath(`/quotes/${quoteId}`)
    return { 
      success: true, 
      message: `Quote ${quote.quote_number} sent to ${quote.customer?.name}` 
    }
  } catch (error) {
    console.error('Error sending quote:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send quote' 
    }
  }
}

// Accept quote (customer action)
export async function acceptQuote(quoteId: string) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Fetch quote and customer to validate permissions (customer or company staff)
    const { data: existing } = await supabase
      .from('quotes')
      .select(`id, status, customer:customers(email)`) 
      .eq('id', quoteId)
      .single()

    if (!existing) {
      throw new Error('Quote not found')
    }

    // If not company staff, ensure the requester is the customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isStaff = profile && ['super_admin','company_admin','manager','dispatcher'].includes(profile.role)
    if (!isStaff && existing.customer?.email && existing.customer.email !== user.email) {
      throw new Error('Not authorized to accept this quote')
    }

    if (existing.status !== 'sent') {
      throw new Error('Only sent quotes can be accepted')
    }

    // Update quote status
    const { data: quote, error } = await supabase
      .from('quotes')
      .update({
        status: 'accepted' as QuoteStatus,
        accepted_at: new Date().toISOString()
      })
      .eq('id', quoteId)
      .eq('status', 'sent')
      .select('quote_number')
      .single()

    if (error) {
      throw error
    }

    if (!quote) {
      throw new Error('Quote not found or cannot be accepted')
    }

    revalidatePath('/quotes')
    revalidatePath(`/quotes/${quoteId}`)
    return { 
      success: true, 
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

// Reject quote (customer action)
export async function rejectQuote(quoteId: string) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Fetch quote and customer to validate permissions (customer or company staff)
    const { data: existing } = await supabase
      .from('quotes')
      .select(`id, status, customer:customers(email)`) 
      .eq('id', quoteId)
      .single()

    if (!existing) {
      throw new Error('Quote not found')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isStaff = profile && ['super_admin','company_admin','manager','dispatcher'].includes(profile.role)
    if (!isStaff && existing.customer?.email && existing.customer.email !== user.email) {
      throw new Error('Not authorized to reject this quote')
    }

    if (existing.status !== 'sent') {
      throw new Error('Only sent quotes can be rejected')
    }

    // Update quote status
    const { data: quote, error } = await supabase
      .from('quotes')
      .update({
        status: 'rejected' as QuoteStatus,
        rejected_at: new Date().toISOString()
      })
      .eq('id', quoteId)
      .eq('status', 'sent')
      .select('quote_number')
      .single()

    if (error) {
      throw error
    }

    if (!quote) {
      throw new Error('Quote not found or cannot be rejected')
    }

    revalidatePath('/quotes')
    revalidatePath(`/quotes/${quoteId}`)
    return { 
      success: true, 
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

// Convert quote to invoice
export async function convertQuoteToInvoice(quoteId: string) {
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

    // Get quote with items
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        quote_items(*)
      `)
      .eq('id', quoteId)
      .eq('company_id', profile.company_id)
      .single()

    if (quoteError || !quote) {
      throw new Error('Quote not found')
    }

    if (quote.status !== 'accepted') {
      throw new Error('Only accepted quotes can be converted to invoices')
    }

    // Generate invoice number
    const { data: invoiceNumber } = await supabase
      .rpc('generate_invoice_number', { company_uuid: profile.company_id })

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        company_id: quote.company_id,
        customer_id: quote.customer_id,
        load_id: quote.load_id,
        invoice_number: invoiceNumber,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        subtotal: quote.subtotal,
        tax_amount: quote.tax_amount,
        total_amount: quote.total_amount,
        currency: quote.currency,
        status: 'pending',
        notes: `Converted from Quote ${quote.quote_number}`
      })
      .select()
      .single()

    if (invoiceError) {
      throw invoiceError
    }

    // Update quote status and link to invoice
    await supabase
      .from('quotes')
      .update({
        status: 'converted' as QuoteStatus,
        converted_to_invoice_id: invoice.id
      })
      .eq('id', quoteId)

    revalidatePath('/quotes')
    revalidatePath('/financial/invoices')
    return { 
      success: true, 
      data: invoice,
      message: `Quote converted to Invoice ${invoice.invoice_number}` 
    }
  } catch (error) {
    console.error('Error converting quote to invoice:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to convert quote to invoice' 
    }
  }
}

// Duplicate quote
export async function duplicateQuote(quoteId: string) {
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

    // Get original quote with items
    const { data: originalQuote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        quote_items(*)
      `)
      .eq('id', quoteId)
      .eq('company_id', profile.company_id)
      .single()

    if (quoteError || !originalQuote) {
      throw new Error('Quote not found')
    }

    // Generate new quote number
    const { data: newQuoteNumber } = await supabase
      .rpc('generate_quote_number', { company_uuid: profile.company_id })

    // Create duplicate quote
    const { data: newQuote, error: newQuoteError } = await supabase
      .from('quotes')
      .insert({
        company_id: originalQuote.company_id,
        customer_id: originalQuote.customer_id,
        load_id: originalQuote.load_id,
        quote_number: newQuoteNumber,
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        subtotal: originalQuote.subtotal,
        tax_amount: originalQuote.tax_amount,
        total_amount: originalQuote.total_amount,
        currency: originalQuote.currency,
        status: 'draft' as QuoteStatus,
        notes: originalQuote.notes,
        terms: originalQuote.terms,
        created_by: user.id
      })
      .select()
      .single()

    if (newQuoteError) {
      throw newQuoteError
    }

    // Duplicate quote items
    if (originalQuote.quote_items && originalQuote.quote_items.length > 0) {
      const newQuoteItems = originalQuote.quote_items.map((item: any) => ({
        quote_id: newQuote.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
        sort_order: item.sort_order
      }))

      const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(newQuoteItems)

      if (itemsError) {
        throw itemsError
      }
    }

    revalidatePath('/quotes')
    return { 
      success: true, 
      data: newQuote,
      message: `Quote duplicated as ${newQuote.quote_number}` 
    }
  } catch (error) {
    console.error('Error duplicating quote:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to duplicate quote' 
    }
  }
}

// Get quotes for a company
export async function getQuotes() {
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

    // Fetch quotes
    const { data: quotes, error } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(name),
        load:loads(load_number),
        quote_items(*)
      `)
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return { success: true, data: quotes }
  } catch (error) {
    console.error('Error fetching quotes:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch quotes' 
    }
  }
}

// Get single quote by ID
export async function getQuote(quoteId: string) {
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

    // Fetch quote
    const { data: quote, error } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(*),
        load:loads(*),
        quote_items(*),
        company:companies(*)
      `)
      .eq('id', quoteId)
      .eq('company_id', profile.company_id)
      .single()

    if (error) {
      throw error
    }

    return { success: true, data: quote }
  } catch (error) {
    console.error('Error fetching quote:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch quote' 
    }
  }
}
