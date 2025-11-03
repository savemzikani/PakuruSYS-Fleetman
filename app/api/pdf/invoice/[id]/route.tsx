import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { InvoicePDF } from "@/lib/pdf/invoice-pdf"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*, company:companies(*)")
      .eq("id", authUser.id)
      .single()

    if (!profile || !profile.company_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch invoice with related data
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select(`
        *,
        customer:customers(*),
        load:loads(load_number),
        company:companies(*)
      `)
      .eq("id", params.id)
      .eq("company_id", profile.company_id)
      .single()

    if (error || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Create sample invoice items (in real app, fetch from invoice_items table)
    const invoiceData = {
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      status: invoice.status,
      subtotal: invoice.subtotal,
      tax_amount: invoice.tax_amount,
      total_amount: invoice.total_amount,
      currency: invoice.currency,
      payment_terms: invoice.payment_terms,
      notes: invoice.notes,
      company: {
        name: invoice.company.name,
        address: invoice.company.address,
        city: invoice.company.city,
        country: invoice.company.country,
        phone: invoice.company.phone,
        email: invoice.company.email,
        registration_number: invoice.company.registration_number,
        tax_number: invoice.company.tax_number,
      },
      customer: {
        name: invoice.customer.name,
        address: invoice.customer.address,
        city: invoice.customer.city,
        country: invoice.customer.country,
        phone: invoice.customer.phone,
        email: invoice.customer.email,
      },
      items: [
        {
          description: `Transportation Service - Load ${invoice.load?.load_number || "N/A"}`,
          quantity: 1,
          unit_price: invoice.subtotal,
          total: invoice.subtotal,
        },
      ],
    }

    // Generate PDF
    const pdfBuffer = await renderToBuffer(<InvoicePDF data={invoiceData} />)

    // Return PDF response
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoice.invoice_number}.pdf"`,
      },
    })
  } catch (error) {
    console.error("[v0] PDF generation error:", error)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}
