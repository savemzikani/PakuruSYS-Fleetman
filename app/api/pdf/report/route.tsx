import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { ReportPDF } from "@/lib/pdf/report-pdf"

export async function POST(request: NextRequest) {
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

    const { reportType, period } = await request.json()

    // Generate report data based on type
    let reportData

    if (reportType === "financial") {
      // Fetch financial data
      const { data: invoices } = await supabase.from("invoices").select("*").eq("company_id", profile.company_id)

      const totalRevenue = invoices?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0
      const paidInvoices = invoices?.filter((inv) => inv.status === "paid").length || 0
      const pendingInvoices = invoices?.filter((inv) => inv.status === "pending").length || 0

      reportData = {
        title: "Financial Report",
        period: period,
        generatedAt: new Date().toISOString(),
        company: {
          name: profile.company.name,
          address: profile.company.address,
          city: profile.company.city,
          country: profile.company.country,
        },
        metrics: [
          { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, change: "+12.5%" },
          { label: "Paid Invoices", value: paidInvoices.toString(), change: "+8.2%" },
          { label: "Pending Invoices", value: pendingInvoices.toString(), change: "-3.1%" },
          {
            label: "Average Invoice",
            value: `$${(totalRevenue / (invoices?.length || 1)).toFixed(2)}`,
            change: "+5.7%",
          },
        ],
        tables: [
          {
            title: "Recent Invoices",
            headers: ["Invoice #", "Customer", "Amount", "Status", "Date"],
            rows:
              invoices?.slice(0, 10).map((inv) => [
                inv.invoice_number,
                "Customer Name", // Would fetch from customer table
                `$${inv.total_amount}`,
                inv.status,
                new Date(inv.invoice_date).toLocaleDateString(),
              ]) || [],
          },
        ],
      }
    } else if (reportType === "fleet") {
      // Fetch fleet data
      const { data: vehicles } = await supabase.from("vehicles").select("*").eq("company_id", profile.company_id)

      const activeVehicles = vehicles?.filter((v) => v.status === "active").length || 0
      const maintenanceVehicles = vehicles?.filter((v) => v.status === "maintenance").length || 0

      reportData = {
        title: "Fleet Report",
        period: period,
        generatedAt: new Date().toISOString(),
        company: {
          name: profile.company.name,
          address: profile.company.address,
          city: profile.company.city,
          country: profile.company.country,
        },
        metrics: [
          { label: "Total Vehicles", value: (vehicles?.length || 0).toString(), change: "+2" },
          { label: "Active Vehicles", value: activeVehicles.toString(), change: "+1" },
          { label: "In Maintenance", value: maintenanceVehicles.toString(), change: "0" },
          { label: "Utilization Rate", value: "87.5%", change: "+3.2%" },
        ],
        tables: [
          {
            title: "Vehicle Status",
            headers: ["Vehicle", "Type", "Status", "Last Service", "Next Service"],
            rows:
              vehicles
                ?.slice(0, 10)
                .map((vehicle) => [
                  `${vehicle.make} ${vehicle.model}`,
                  vehicle.vehicle_type,
                  vehicle.status,
                  vehicle.last_service_date ? new Date(vehicle.last_service_date).toLocaleDateString() : "N/A",
                  vehicle.next_service_date ? new Date(vehicle.next_service_date).toLocaleDateString() : "N/A",
                ]) || [],
          },
        ],
      }
    } else {
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
    }

    // Generate PDF
    const pdfBuffer = await renderToBuffer(<ReportPDF data={reportData} />)

    // Return PDF response
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${reportType}-report-${period}.pdf"`,
      },
    })
  } catch (error) {
    console.error("[v0] Report PDF generation error:", error)
    return NextResponse.json({ error: "Failed to generate report PDF" }, { status: 500 })
  }
}
