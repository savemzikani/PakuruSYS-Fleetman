"use server"

import { createClient } from "@/lib/supabase/server"

// Email service configuration
interface EmailConfig {
  provider: 'sendgrid' | 'resend' | 'ses' | 'smtp'
  apiKey?: string
  region?: string
  host?: string
  port?: number
  username?: string
  password?: string
  fromEmail: string
  fromName: string
}

// Email template data interfaces
interface QuoteEmailData {
  quote: {
    quote_number: string
    quote_date: string
    valid_until: string
    total_amount: number
    currency: string
    notes?: string
  }
  customer: {
    name: string
    email: string
    contact_person?: string
  }
  company: {
    name: string
    email: string
    phone?: string
    address?: string
  }
  quote_url: string
}

interface InvoiceEmailData {
  invoice: {
    invoice_number: string
    issue_date: string
    due_date: string
    total_amount: number
    currency: string
    status: string
  }
  customer: {
    name: string
    email: string
    contact_person?: string
  }
  company: {
    name: string
    email: string
    phone?: string
    address?: string
  }
  invoice_url: string
  payment_url?: string
}

// Get email configuration from environment
function getEmailConfig(): EmailConfig {
  const provider = (process.env.EMAIL_PROVIDER || 'smtp') as EmailConfig['provider']
  
  return {
    provider,
    apiKey: process.env.EMAIL_API_KEY,
    region: process.env.AWS_REGION,
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
    username: process.env.SMTP_USERNAME,
    password: process.env.SMTP_PASSWORD,
    fromEmail: process.env.FROM_EMAIL || 'noreply@example.com',
    fromName: process.env.FROM_NAME || 'SADC Logistics'
  }
}

// Generate quote email HTML template
function generateQuoteEmailTemplate(data: QuoteEmailData): string {
  const { quote, customer, company, quote_url } = data
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Quote ${quote.quote_number}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .quote-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        .amount { font-size: 24px; font-weight: bold; color: #2563eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Quote from ${company.name}</h1>
        </div>
        
        <div class="content">
          <p>Dear ${customer.contact_person || customer.name},</p>
          
          <p>We are pleased to provide you with the following quote for your transportation needs:</p>
          
          <div class="quote-details">
            <h3>Quote Details</h3>
            <p><strong>Quote Number:</strong> ${quote.quote_number}</p>
            <p><strong>Quote Date:</strong> ${new Date(quote.quote_date).toLocaleDateString()}</p>
            <p><strong>Valid Until:</strong> ${new Date(quote.valid_until).toLocaleDateString()}</p>
            <p><strong>Total Amount:</strong> <span class="amount">${quote.currency} ${quote.total_amount.toLocaleString()}</span></p>
            ${quote.notes ? `<p><strong>Notes:</strong> ${quote.notes}</p>` : ''}
          </div>
          
          <p>To view the complete quote details and accept or decline this quote, please click the button below:</p>
          
          <div style="text-align: center;">
            <a href="${quote_url}" class="button">View Quote</a>
          </div>
          
          <p>If you have any questions about this quote, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br>
          ${company.name}<br>
          ${company.email}<br>
          ${company.phone || ''}</p>
        </div>
        
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Generate invoice email HTML template
function generateInvoiceEmailTemplate(data: InvoiceEmailData): string {
  const { invoice, customer, company, invoice_url, payment_url } = data
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${invoice.invoice_number}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .invoice-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
        .button.secondary { background: #6b7280; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        .amount { font-size: 24px; font-weight: bold; color: #059669; }
        .status { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .status.pending { background: #fef3c7; color: #92400e; }
        .status.paid { background: #d1fae5; color: #065f46; }
        .status.overdue { background: #fee2e2; color: #991b1b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Invoice from ${company.name}</h1>
        </div>
        
        <div class="content">
          <p>Dear ${customer.contact_person || customer.name},</p>
          
          <p>Please find your invoice details below:</p>
          
          <div class="invoice-details">
            <h3>Invoice Details</h3>
            <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
            <p><strong>Issue Date:</strong> ${new Date(invoice.issue_date).toLocaleDateString()}</p>
            <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
            <p><strong>Status:</strong> <span class="status ${invoice.status}">${invoice.status.toUpperCase()}</span></p>
            <p><strong>Total Amount:</strong> <span class="amount">${invoice.currency} ${invoice.total_amount.toLocaleString()}</span></p>
          </div>
          
          <div style="text-align: center;">
            <a href="${invoice_url}" class="button">View Invoice</a>
            ${payment_url ? `<a href="${payment_url}" class="button">Pay Now</a>` : ''}
          </div>
          
          <p>Please ensure payment is made by the due date to avoid any late fees.</p>
          
          <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br>
          ${company.name}<br>
          ${company.email}<br>
          ${company.phone || ''}</p>
        </div>
        
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Mock email sending function (replace with actual implementation)
async function sendEmailMock(to: string, subject: string, html: string, attachments?: any[]) {
  console.log('📧 Mock Email Sent:')
  console.log(`To: ${to}`)
  console.log(`Subject: ${subject}`)
  console.log(`HTML Length: ${html.length} characters`)
  if (attachments) {
    console.log(`Attachments: ${attachments.length}`)
  }
  
  // Simulate email sending delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  return { success: true, messageId: `mock-${Date.now()}` }
}

// Send quote email to customer
export async function sendQuoteEmail(quoteId: string) {
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

    // Get quote with customer and company details
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(*),
        company:companies(*)
      `)
      .eq('id', quoteId)
      .eq('company_id', profile.company_id)
      .single()

    if (quoteError || !quote) {
      throw new Error('Quote not found')
    }

    if (!quote.customer?.email) {
      throw new Error('Customer email not found')
    }

    if (quote.status !== 'draft') {
      throw new Error('Only draft quotes can be sent')
    }

    // Prepare email data
    const emailData: QuoteEmailData = {
      quote: {
        quote_number: quote.quote_number,
        quote_date: quote.quote_date,
        valid_until: quote.valid_until,
        total_amount: quote.total_amount,
        currency: quote.currency,
        notes: quote.notes
      },
      customer: {
        name: quote.customer.name,
        email: quote.customer.email,
        contact_person: quote.customer.contact_person
      },
      company: {
        name: quote.company.name,
        email: quote.company.email,
        phone: quote.company.phone,
        address: quote.company.address
      },
      quote_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/quotes/${quoteId}`
    }

    // Generate email content
    const html = generateQuoteEmailTemplate(emailData)
    const subject = `Quote ${quote.quote_number} from ${quote.company.name}`

    // Send email (using mock for now)
    const result = await sendEmailMock(quote.customer.email, subject, html)

    if (result.success) {
      // Update quote status to sent
      await supabase
        .from('quotes')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', quoteId)

      return {
        success: true,
        message: `Quote ${quote.quote_number} sent to ${quote.customer.name}`
      }
    } else {
      throw new Error('Failed to send email')
    }
  } catch (error) {
    console.error('Error sending quote email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send quote email'
    }
  }
}

// Send invoice email to customer
export async function sendInvoiceEmail(invoiceId: string) {
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

    // Get invoice with customer and company details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(*),
        company:companies(*)
      `)
      .eq('id', invoiceId)
      .eq('company_id', profile.company_id)
      .single()

    if (invoiceError || !invoice) {
      throw new Error('Invoice not found')
    }

    if (!invoice.customer?.email) {
      throw new Error('Customer email not found')
    }

    // Prepare email data
    const emailData: InvoiceEmailData = {
      invoice: {
        invoice_number: invoice.invoice_number,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        total_amount: invoice.total_amount,
        currency: invoice.currency,
        status: invoice.status
      },
      customer: {
        name: invoice.customer.name,
        email: invoice.customer.email,
        contact_person: invoice.customer.contact_person
      },
      company: {
        name: invoice.company.name,
        email: invoice.company.email,
        phone: invoice.company.phone,
        address: invoice.company.address
      },
      invoice_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/invoices/${invoiceId}`,
      payment_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/invoices/${invoiceId}/pay`
    }

    // Generate email content
    const html = generateInvoiceEmailTemplate(emailData)
    const subject = `Invoice ${invoice.invoice_number} from ${invoice.company.name}`

    // Send email (using mock for now)
    const result = await sendEmailMock(invoice.customer.email, subject, html)

    if (result.success) {
      return {
        success: true,
        message: `Invoice ${invoice.invoice_number} sent to ${invoice.customer.name}`
      }
    } else {
      throw new Error('Failed to send email')
    }
  } catch (error) {
    console.error('Error sending invoice email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send invoice email'
    }
  }
}

// Send payment reminder email
export async function sendPaymentReminderEmail(invoiceId: string) {
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

    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(*),
        company:companies(*)
      `)
      .eq('id', invoiceId)
      .eq('company_id', profile.company_id)
      .single()

    if (invoiceError || !invoice) {
      throw new Error('Invoice not found')
    }

    if (!invoice.customer?.email) {
      throw new Error('Customer email not found')
    }

    if (invoice.status !== 'pending') {
      throw new Error('Can only send reminders for pending invoices')
    }

    // Check if invoice is overdue
    const dueDate = new Date(invoice.due_date)
    const today = new Date()
    const isOverdue = dueDate < today

    // Prepare email data with reminder context
    const emailData: InvoiceEmailData = {
      invoice: {
        invoice_number: invoice.invoice_number,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        total_amount: invoice.total_amount,
        currency: invoice.currency,
        status: isOverdue ? 'overdue' : invoice.status
      },
      customer: {
        name: invoice.customer.name,
        email: invoice.customer.email,
        contact_person: invoice.customer.contact_person
      },
      company: {
        name: invoice.company.name,
        email: invoice.company.email,
        phone: invoice.company.phone,
        address: invoice.company.address
      },
      invoice_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/invoices/${invoiceId}`,
      payment_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/invoices/${invoiceId}/pay`
    }

    // Generate email content
    const html = generateInvoiceEmailTemplate(emailData)
    const subject = isOverdue 
      ? `OVERDUE: Invoice ${invoice.invoice_number} Payment Required`
      : `Payment Reminder: Invoice ${invoice.invoice_number}`

    // Send email (using mock for now)
    const result = await sendEmailMock(invoice.customer.email, subject, html)

    if (result.success) {
      return {
        success: true,
        message: `Payment reminder sent for Invoice ${invoice.invoice_number}`
      }
    } else {
      throw new Error('Failed to send email')
    }
  } catch (error) {
    console.error('Error sending payment reminder:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send payment reminder'
    }
  }
}
