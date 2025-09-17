"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// Add customer payment method
export async function addCustomerPaymentMethod(customerId: string, formData: FormData) {
  const supabase = await createClient()
  
  try {
    // Extract form data
    const payment_type = formData.get('payment_type') as string
    const provider = formData.get('provider') as string
    const masked_details = formData.get('masked_details') as string
    const is_default = formData.get('is_default') === 'true'
    const metadata = formData.get('metadata') ? JSON.parse(formData.get('metadata') as string) : {}

    // Verify customer exists
    const { data: customer } = await supabase
      .from('customers')
      .select('id, company_id')
      .eq('id', customerId)
      .eq('is_active', true)
      .single()

    if (!customer) {
      throw new Error('Customer not found')
    }

    // If this is set as default, unset other defaults
    if (is_default) {
      await supabase
        .from('customer_payment_methods')
        .update({ is_default: false })
        .eq('customer_id', customerId)
    }

    // Create payment method
    const { data: paymentMethod, error } = await supabase
      .from('customer_payment_methods')
      .insert({
        customer_id: customerId,
        payment_type,
        provider,
        masked_details,
        is_default,
        metadata
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return { 
      success: true, 
      data: paymentMethod,
      message: 'Payment method added successfully' 
    }
  } catch (error) {
    console.error('Error adding payment method:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to add payment method' 
    }
  }
}

// Process invoice payment
export async function processInvoicePayment(invoiceId: string, paymentMethodId: string, amount?: number) {
  const supabase = await createClient()
  
  try {
    // Get invoice details
    const { data: invoice } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('id', invoiceId)
      .eq('status', 'pending')
      .single()

    if (!invoice) {
      throw new Error('Invoice not found or already paid')
    }

    // Get payment method
    const { data: paymentMethod } = await supabase
      .from('customer_payment_methods')
      .select('*')
      .eq('id', paymentMethodId)
      .eq('customer_id', invoice.customer_id)
      .eq('is_active', true)
      .single()

    if (!paymentMethod) {
      throw new Error('Payment method not found')
    }

    const paymentAmount = amount || invoice.total_amount
    const transactionReference = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Create payment transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        invoice_id: invoiceId,
        customer_id: invoice.customer_id,
        payment_method_id: paymentMethodId,
        amount: paymentAmount,
        currency: invoice.currency,
        transaction_reference: transactionReference,
        status: 'processing'
      })
      .select()
      .single()

    if (transactionError) {
      throw transactionError
    }

    // Simulate payment processing (in real implementation, call payment gateway)
    const paymentResult = await simulatePaymentGateway(paymentMethod, paymentAmount, invoice.currency)

    // Update transaction with gateway response
    const { data: updatedTransaction, error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        status: paymentResult.success ? 'completed' : 'failed',
        gateway_reference: paymentResult.gatewayReference,
        gateway_response: paymentResult,
        processed_at: new Date().toISOString()
      })
      .eq('id', transaction.id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // If payment successful, update invoice
    if (paymentResult.success) {
      await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_date: new Date().toISOString().split('T')[0],
          paid_amount: paymentAmount
        })
        .eq('id', invoiceId)

      revalidatePath('/portal/invoices')
      revalidatePath('/admin/invoices')
    }

    return { 
      success: paymentResult.success, 
      data: updatedTransaction,
      message: paymentResult.success ? 
        `Payment of ${paymentAmount} ${invoice.currency} processed successfully` :
        `Payment failed: ${paymentResult.error}`
    }
  } catch (error) {
    console.error('Error processing payment:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to process payment' 
    }
  }
}

// Simulate payment gateway (replace with real gateway integration)
async function simulatePaymentGateway(paymentMethod: any, amount: number, currency: string) {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Simulate 95% success rate
  const success = Math.random() > 0.05

  return {
    success,
    gatewayReference: `GW-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    amount,
    currency,
    paymentMethod: paymentMethod.payment_type,
    provider: paymentMethod.provider,
    error: success ? null : 'Insufficient funds or card declined',
    timestamp: new Date().toISOString()
  }
}

// Get customer payment methods
export async function getCustomerPaymentMethods(customerId: string) {
  const supabase = await createClient()
  
  try {
    const { data: paymentMethods, error } = await supabase
      .from('customer_payment_methods')
      .select('*')
      .eq('customer_id', customerId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return { success: true, data: paymentMethods }
  } catch (error) {
    console.error('Error fetching payment methods:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch payment methods'
    }
  }
}

// Get payment transactions for a company
export async function getPaymentTransactions(filters?: {
  status?: string
  customer_id?: string
  date_from?: string
  date_to?: string
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
      .from('payment_transactions')
      .select(`
        *,
        invoice:invoices(invoice_number, total_amount),
        customer:customers(name, contact_person),
        payment_method:customer_payment_methods(payment_type, provider, masked_details)
      `)
      .eq('invoice.company_id', profile.company_id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.customer_id) {
      query = query.eq('customer_id', filters.customer_id)
    }
    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from)
    }
    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to + 'T23:59:59')
    }

    const { data: transactions, error } = await query

    if (error) {
      throw error
    }

    return { success: true, data: transactions }
  } catch (error) {
    console.error('Error fetching payment transactions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch payment transactions'
    }
  }
}

// Get payment statistics
export async function getPaymentStats() {
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

    // Get payment transactions
    const { data: transactions } = await supabase
      .from('payment_transactions')
      .select(`
        amount,
        currency,
        status,
        created_at,
        invoice:invoices!inner(company_id)
      `)
      .eq('invoice.company_id', profile.company_id)

    if (!transactions || transactions.length === 0) {
      return {
        success: true,
        data: {
          totalTransactions: 0,
          completedPayments: 0,
          failedPayments: 0,
          totalAmount: 0,
          averageAmount: 0,
          successRate: 0,
          monthlyTrend: {}
        }
      }
    }

    const stats = {
      totalTransactions: transactions.length,
      completedPayments: transactions.filter(t => t.status === 'completed').length,
      failedPayments: transactions.filter(t => t.status === 'failed').length,
      totalAmount: transactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0),
      averageAmount: 0,
      successRate: 0,
      monthlyTrend: {} as Record<string, number>
    }

    stats.averageAmount = stats.completedPayments > 0 ? stats.totalAmount / stats.completedPayments : 0
    stats.successRate = stats.totalTransactions > 0 ? (stats.completedPayments / stats.totalTransactions) * 100 : 0

    // Monthly trend
    stats.monthlyTrend = transactions
      .filter(t => t.status === 'completed')
      .reduce((acc, t) => {
        const month = new Date(t.created_at).toISOString().substring(0, 7)
        acc[month] = (acc[month] || 0) + parseFloat(t.amount.toString())
        return acc
      }, {} as Record<string, number>)

    return { success: true, data: stats }
  } catch (error) {
    console.error('Error fetching payment stats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch payment statistics'
    }
  }
}

// Refund payment
export async function refundPayment(transactionId: string, amount?: number, reason?: string) {
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

    // Get transaction
    const { data: transaction } = await supabase
      .from('payment_transactions')
      .select(`
        *,
        invoice:invoices!inner(company_id)
      `)
      .eq('id', transactionId)
      .eq('status', 'completed')
      .eq('invoice.company_id', profile.company_id)
      .single()

    if (!transaction) {
      throw new Error('Transaction not found or cannot be refunded')
    }

    const refundAmount = amount || transaction.amount
    if (refundAmount > transaction.amount) {
      throw new Error('Refund amount cannot exceed original payment amount')
    }

    // Create refund transaction
    const refundReference = `REF-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    
    const { data: refund, error } = await supabase
      .from('payment_transactions')
      .insert({
        invoice_id: transaction.invoice_id,
        customer_id: transaction.customer_id,
        payment_method_id: transaction.payment_method_id,
        amount: -refundAmount, // Negative amount for refund
        currency: transaction.currency,
        transaction_reference: refundReference,
        gateway_reference: `REFUND-${transaction.gateway_reference}`,
        status: 'completed',
        gateway_response: {
          type: 'refund',
          original_transaction: transaction.transaction_reference,
          reason: reason || 'Manual refund',
          processed_by: user.id
        },
        processed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Update invoice if fully refunded
    if (refundAmount === transaction.amount) {
      await supabase
        .from('invoices')
        .update({
          status: 'refunded',
          refunded_date: new Date().toISOString().split('T')[0],
          refunded_amount: refundAmount
        })
        .eq('id', transaction.invoice_id)
    }

    revalidatePath('/admin/payments')
    revalidatePath('/admin/invoices')
    
    return { 
      success: true, 
      data: refund,
      message: `Refund of ${refundAmount} ${transaction.currency} processed successfully` 
    }
  } catch (error) {
    console.error('Error processing refund:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to process refund' 
    }
  }
}
