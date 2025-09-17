import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { QuotePDF } from "@/lib/pdf/quote-pdf"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*, company:companies(*)")
      .eq("id", authUser.id)
      .single()

    if (!profile || !profile.company_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: quote } = await supabase
      .from("quotes")
      .select(`
        *,
        customer:customers(*),
        load:loads(load_number),
        company:companies(*)
      `)
      .eq("id", params.id)
      .eq("company_id", profile.company_id)
      .single()

    if (!quote) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Items currently not normalized; map from available quote fields or compute a single line
    const items = [
      {
        description: quote.description || `Transportation Services${quote.load?.load_number ? ` - Load ${quote.load.load_number}` : ""}`,
        quantity: 1,
        unit_price: quote.subtotal,
        total: quote.subtotal,
      },
    ]

    const data = {
      quote_number: quote.quote_number,
      quote_date: quote.quote_date,
      valid_until: quote.valid_until,
      currency: quote.currency,
      subtotal: quote.subtotal,
      tax_amount: quote.tax_amount,
      total_amount: quote.total_amount,
      notes: quote.notes,
      terms: quote.terms,
      company: {
        name: quote.company.name,
        address: quote.company.address,
        city: quote.company.city,
        country: quote.company.country,
        phone: quote.company.phone,
        email: quote.company.email,
        registration_number: quote.company.registration_number,
        tax_number: quote.company.tax_number,
      },
      customer: {
        name: quote.customer.name,
        address: quote.customer.address,
        city: quote.customer.city,
        country: quote.customer.country,
        phone: quote.customer.phone,
        email: quote.customer.email,
      },
      items,
    }

    const pdfBuffer = await renderToBuffer(<QuotePDF data={data} />)

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="quote-${quote.quote_number}.pdf"`,
      },
    })
  } catch (error) {
    console.error("[v0] Quote PDF generation error:", error)
    return NextResponse.json({ error: "Failed to generate quote PDF" }, { status: 500 })
  }
}


