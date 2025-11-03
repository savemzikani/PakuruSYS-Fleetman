import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Plus, Search, Download, Send } from "lucide-react"
import Link from "next/link"
import type { Invoice } from "@/lib/types/database"

export default async function InvoicesPage() {
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

  // Fetch invoices with related data
  const { data: invoices } = await supabase
    .from("invoices")
    .select(`
      *,
      customer:customers(name),
      load:loads(load_number)
    `)
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false })

  // Calculate invoice statistics
  const totalInvoices = invoices?.length || 0
  const paidInvoices = invoices?.filter((inv) => inv.status === "paid").length || 0
  const pendingInvoices = invoices?.filter((inv) => inv.status === "pending").length || 0
  const overdueInvoices =
    invoices?.filter((inv) => {
      if (inv.status !== "pending") return false
      const dueDate = new Date(inv.due_date)
      return dueDate < new Date()
    }).length || 0

  const totalAmount = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0
  const paidAmount =
    invoices?.filter((inv) => inv.status === "paid").reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0
  const pendingAmount =
    invoices?.filter((inv) => inv.status === "pending").reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0

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

  const isOverdue = (invoice: Invoice) => {
    if (invoice.status !== "pending") return false
    const dueDate = new Date(invoice.due_date)
    return dueDate < new Date()
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
            <div className="text-2xl font-bold text-red-600">{overdueInvoices}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search by invoice number, customer..." className="pl-10" />
              </div>
            </div>
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {/* Add customer options dynamically */}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoice List */}
      <div className="grid gap-4">
        {invoices?.map((invoice: Invoice) => (
          <Card key={invoice.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{invoice.invoice_number}</h3>
                    <p className="text-muted-foreground">{invoice.customer?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className={getStatusColor(isOverdue(invoice) ? "overdue" : invoice.status)}>
                    {isOverdue(invoice) ? "Overdue" : invoice.status}
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
                  <p className="text-sm font-medium">{new Date(invoice.issue_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Due Date</p>
                  <p className={`text-sm font-medium ${isOverdue(invoice) ? "text-red-600" : ""}`}>
                    {new Date(invoice.due_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Load Number</p>
                  <p className="text-sm font-medium">{invoice.load?.load_number || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment Terms</p>
                  <p className="text-sm font-medium">{invoice.customer?.payment_terms || "N/A"} days</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3 mb-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Subtotal:</span>{" "}
                  <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tax:</span>{" "}
                  <span className="font-medium">{formatCurrency(invoice.tax_amount)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span>{" "}
                  <span className="font-medium">{formatCurrency(invoice.total_amount)}</span>
                </div>
              </div>

              <div className="flex gap-2">
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
                {invoice.status === "pending" && (
                  <Button variant="outline" size="sm">
                    <Send className="h-4 w-4 mr-1" />
                    Send Reminder
                  </Button>
                )}
                {invoice.status === "pending" && (
                  <Button variant="outline" size="sm">
                    Mark as Paid
                  </Button>
                )}
                <Link href={`/financial/invoices/${invoice.id}/edit`}>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!invoices || invoices.length === 0) && (
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
