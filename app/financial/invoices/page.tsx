import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Plus, Download } from "lucide-react"

import Link from "next/link"
import type { Invoice } from "@/lib/types/database"
import { InvoiceFilters, type InvoiceFilterCustomer } from "@/components/financial/invoice-filters"
import { InvoiceActions } from "@/components/financial/invoice-actions"

type InvoicesPageSearchParams = {
  q?: string | string[]
  status?: string | string[]
  customer?: string | string[]
}

const extractParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value ?? "")

const sanitizeSearchTerm = (value: string) => value.replace(/[%_*]/g, "").replace(/,+/g, " ").trim()

const buildIlikePattern = (value: string) => {
  const sanitized = sanitizeSearchTerm(value)
  return sanitized ? `*${sanitized}*` : ""
}

const isInvoiceOverdue = (invoice: Invoice) => {
  if (invoice.status === "paid" || invoice.status === "cancelled") {
    return false
  }

  if (invoice.status === "overdue") {
    return true
  }

  if (!invoice.due_date) {
    return false
  }

  const dueDate = new Date(invoice.due_date)
  return dueDate < new Date()
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams?: InvoicesPageSearchParams
}) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, company:companies(*)")
    .eq("id", authUser.id)
    .single()

  if (!profile || !profile.company_id) {
    redirect("/auth/login")
  }

  // Check permissions
  if (!["super_admin", "company_admin", "manager"].includes(profile.role)) {
    redirect("/dashboard")
  }

  const searchTermRaw = extractParam(searchParams?.q)
  const statusFilterRaw = extractParam(searchParams?.status).trim() || "all"
  const customerFilterRaw = extractParam(searchParams?.customer).trim() || "all"
  const sanitizedSearchTerm = sanitizeSearchTerm(searchTermRaw)
  const ilikePattern = buildIlikePattern(searchTermRaw)

  const nowIso = new Date().toISOString()

  let invoiceQuery = supabase
    .from("invoices")
    .select(`
      *,
      customer:customers(name),
      load:loads(load_number)
    `)
    .eq("company_id", profile.company_id)

  if (statusFilterRaw !== "all") {
    if (statusFilterRaw === "overdue") {
      invoiceQuery = invoiceQuery.or(
        `status.eq.overdue,and(status.neq.paid,status.neq.cancelled,due_date.not.is.null,due_date.lt.${nowIso})`,
      )
    } else {
      invoiceQuery = invoiceQuery.eq("status", statusFilterRaw)
    }
  }

  if (customerFilterRaw !== "all") {
    invoiceQuery = invoiceQuery.eq("customer_id", customerFilterRaw)
  }

  if (ilikePattern) {
    invoiceQuery = invoiceQuery.or(`invoice_number.ilike.${ilikePattern},notes.ilike.${ilikePattern}`)
  }

  // Fetch invoices with related data
  const [{ data: invoices }, { data: customers }] = await Promise.all([
    invoiceQuery.order("created_at", { ascending: false }),
    supabase
      .from("customers")
      .select("id, name")
      .eq("company_id", profile.company_id)
      .order("name", { ascending: true }),
  ])

  type InvoiceWithRelations = Invoice & {
    customer?: { name?: string | null }
    load?: { load_number?: string | null }
  }

  const invoiceList = (invoices ?? []) as InvoiceWithRelations[]
  const customerList = (customers ?? []) as { id: string; name: string | null }[]
  const filterCustomers: InvoiceFilterCustomer[] = customerList.map((customer) => ({
    id: customer.id,
    name: customer.name,
  }))

  const normalizedSearch = sanitizedSearchTerm.toLowerCase()

  const filteredInvoices = invoiceList.filter((invoice) => {
    if (!normalizedSearch) {
      return true
    }

    const tokens = [
      invoice.invoice_number,
      invoice.customer?.name ?? "",
      invoice.load?.load_number ?? "",
      invoice.notes ?? "",
    ]

    const matchesSearch = tokens.some((token) => token?.toLowerCase().includes(normalizedSearch))

    return matchesSearch
  })

  // Calculate invoice statistics
  const totalInvoices = invoiceList.length
  const paidInvoices = invoiceList.filter((inv) => inv.status === "paid").length
  const pendingInvoices = invoiceList.filter((inv) => inv.status === "pending").length
  const overdueInvoices = invoiceList.filter((inv) => isInvoiceOverdue(inv))

  const totalAmount = invoiceList.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
  const paidAmount = invoiceList
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
  const pendingAmount = invoiceList
    .filter((inv) => inv.status === "pending")
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
  const overdueCount = overdueInvoices.length

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "overdue":
        return "bg-red-100 text-red-800"
      case "cancelled":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Invoice Management</h1>
          <p className="text-muted-foreground">Create, track, and manage customer invoices</p>
        </div>
        <Link href="/financial/invoices/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </Link>
      </div>

      {/* Invoice Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvoices}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(totalAmount)} total value</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{paidInvoices}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(paidAmount)} collected</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingInvoices}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(pendingAmount)} outstanding</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <div className="h-2 w-2 bg-red-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(overdueAmount)} overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceFilters
            search={searchTermRaw}
            status={statusFilterRaw}
            customer={customerFilterRaw}
            customers={filterCustomers}
          />
        </CardContent>
      </Card>

      {/* Invoice List */}
      <div className="grid gap-4">
        {filteredInvoices.length > 0 ? (
          filteredInvoices.map((invoice) => {
            const overdue = isInvoiceOverdue(invoice)
            const customerName = invoice.customer?.name ?? "Unknown customer"

            return (
              <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{invoice.invoice_number}</h3>
                        <p className="text-muted-foreground">{customerName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={getStatusColor(overdue ? "overdue" : invoice.status)}>
                        {overdue ? "Overdue" : invoice.status}
                      </Badge>
                      <div className="text-right">
                        <p className="text-lg font-bold">{formatCurrency(invoice.total_amount)}</p>
                        <p className="text-xs text-muted-foreground">{invoice.currency}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Invoice Date</p>
                      <p className="text-sm font-medium">
                        {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Due Date</p>
                      <p className={`text-sm font-medium ${overdue ? "text-red-600" : ""}`}>
                        {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Load Number</p>
                      <p className="text-sm font-medium">{invoice.load?.load_number || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Payment Terms</p>
                      <p className="text-sm font-medium">
                        {typeof invoice.payment_terms === "number" ? `${invoice.payment_terms} days` : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3 mb-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">Subtotal:</span>{" "}
                      <span className="font-medium">{formatCurrency(invoice.subtotal ?? 0)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tax:</span>{" "}
                      <span className="font-medium">{formatCurrency(invoice.tax_amount ?? 0)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total:</span>{" "}
                      <span className="font-medium">{formatCurrency(invoice.total_amount ?? 0)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link href={`/financial/invoices/${invoice.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/api/pdf/invoice/${invoice.id}`, "_blank")}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download PDF
                    </Button>
                    <InvoiceActions invoiceId={invoice.id} status={invoice.status} isOverdue={overdue} />
                    <Link href={`/financial/invoices/${invoice.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
              <p className="text-muted-foreground mb-4">Get started by creating your first invoice.</p>
              <Link href="/financial/invoices/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
