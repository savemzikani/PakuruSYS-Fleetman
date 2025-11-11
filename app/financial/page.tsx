import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Plus, TrendingUp, AlertTriangle, Calendar, FileText, ClipboardList, Clock, AlertCircle } from "lucide-react"
import Link from "next/link"
import { FinancialCharts } from "@/components/financial/financial-charts"
import type { Invoice, Quote } from "@/lib/types/database"

export default async function FinancialPage() {
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

  // Fetch financial data
  const [{ data: invoices }, { data: expenses }, { data: quotes }] = await Promise.all([
    supabase
      .from("invoices")
      .select(`
        *,
        customer:customers(name),
        load:loads(load_number)
      `)
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("expenses")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("quotes")
      .select("*, customer:customers(name)")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false }),
  ])

  // Calculate financial metrics
  const invoiceList = (invoices ?? []) as Invoice[]
  const expenseList = (expenses ?? []) as { amount?: number | null }[]
  const quoteList = (quotes ?? []) as (Quote & {
    customer?: { name: string | null }
  })[]

  const totalRevenue = invoiceList.reduce((sum: number, inv: Invoice) => sum + (inv.total_amount || 0), 0)
  const totalExpenses = expenseList.reduce((sum: number, exp) => sum + (exp.amount || 0), 0)
  const netProfit = totalRevenue - totalExpenses
  const pendingInvoices = invoiceList.filter((inv) => inv.status === "pending")
  const overdueInvoices = invoiceList.filter((inv) => {
    if (inv.status !== "pending") return false
    const dueDate = new Date(inv.due_date)
    return dueDate < new Date()
  })

  const pendingAmount = pendingInvoices.reduce((sum: number, inv: Invoice) => sum + (inv.total_amount || 0), 0)
  const overdueAmount = overdueInvoices.reduce((sum: number, inv: Invoice) => sum + (inv.total_amount || 0), 0)

  const openQuoteStatuses: Quote["status"][] = ["draft", "sent", "approved", "accepted"]
  const openQuotes = quoteList.filter((quote) => openQuoteStatuses.includes(quote.status))
  const openQuoteValue = openQuotes.reduce((sum, quote) => sum + (quote.total_amount ?? 0), 0)

  const quoteStatusOrder: Quote["status"][] = ["draft", "sent", "approved", "accepted", "rejected", "expired", "converted"]
  const quoteStatusColors: Record<Quote["status"], string> = {
    draft: "#94a3b8",
    sent: "#3b82f6",
    approved: "#10b981",
    accepted: "#22c55e",
    rejected: "#ef4444",
    expired: "#f97316",
    converted: "#a855f7",
  }

  const now = new Date()
  const upcomingThreshold = new Date(now)
  upcomingThreshold.setDate(now.getDate() + 7)

  const expiringQuotes = quoteList.filter((quote) => {
    if (!quote.valid_until) return false
    const validUntil = new Date(quote.valid_until)
    return (
      validUntil >= now &&
      validUntil <= upcomingThreshold &&
      openQuoteStatuses.includes(quote.status)
    )
  })

  const overdueQuotes = quoteList.filter((quote) => {
    const validUntil = quote.valid_until ? new Date(quote.valid_until) : null
    const isPastDue = validUntil ? validUntil < now : false
    return (
      quote.status === "expired" ||
      (isPastDue && !["converted", "rejected"].includes(quote.status))
    )
  })

  // Prepare chart data
  const monthlyRevenue = invoiceList.reduce((acc: Record<string, number>, invoice: Invoice) => {
    const month = new Date(invoice.created_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" })
    acc[month] = (acc[month] || 0) + (invoice.total_amount || 0)
    return acc
  }, {})

  const revenueChartData = Object.entries(monthlyRevenue)
    .slice(-6)
    .map(([month, revenue]): { month: string; revenue: number } => ({
      month,
      revenue,
    }))

  const invoiceStatusData = [
    { name: "Paid", value: invoiceList.filter((inv) => inv.status === "paid").length, color: "#10b981" },
    { name: "Pending", value: pendingInvoices.length, color: "#f59e0b" },
    { name: "Overdue", value: overdueInvoices.length, color: "#ef4444" },
  ]

  const quoteStatusData = quoteStatusOrder
    .map((status) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: quoteList.filter((quote) => quote.status === status).length,
      color: quoteStatusColors[status],
    }))
    .filter((item) => item.value > 0)

  const chartCurrency = invoiceList[0]?.currency ?? "USD"

  const formatCurrency = (amount: number, currency = chartCurrency) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
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

  const getQuoteStatusColor = (status: Quote["status"]) => {
    switch (status) {
      case "draft":
        return "bg-slate-100 text-slate-700"
      case "sent":
        return "bg-blue-100 text-blue-800"
      case "approved":
        return "bg-emerald-100 text-emerald-700"
      case "accepted":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-700"
      case "expired":
        return "bg-orange-100 text-orange-800"
      case "converted":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financial Management</h1>
          <p className="text-muted-foreground">Track revenue, expenses, and financial performance</p>
        </div>
        <div className="flex gap-2">
          <Link href="/financial/invoices/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </Link>
          <Link href="/financial/expenses/add">
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </Link>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">+5% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">{netProfit >= 0 ? "Profitable" : "Loss"} this period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(pendingAmount)}</div>
            <p className="text-xs text-muted-foreground">{pendingInvoices.length} pending invoices</p>
            {overdueAmount > 0 ? (
              <p className="text-xs text-muted-foreground">{formatCurrency(overdueAmount)} overdue</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Quotes</CardTitle>
            <ClipboardList className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(openQuoteValue)}</div>
            <p className="text-xs text-muted-foreground">{openQuotes.length} active quotes</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <FinancialCharts
        revenueData={revenueChartData}
        invoiceStatusData={invoiceStatusData}
        quoteStatusData={quoteStatusData}
        currency={chartCurrency}
      />

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Link href="/financial/invoices">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <FileText className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Manage Invoices</h3>
              <p className="text-sm text-muted-foreground">View and manage all invoices</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/financial/expenses">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <DollarSign className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Track Expenses</h3>
              <p className="text-sm text-muted-foreground">Monitor business expenses</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/financial/reports">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Financial Reports</h3>
              <p className="text-sm text-muted-foreground">Generate detailed reports</p>
            </CardContent>
          </Card>
        </Link>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <Calendar className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Payment Reminders</h3>
            <p className="text-sm text-muted-foreground">Automated payment follow-ups</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Invoices</CardTitle>
          <Link href="/financial/invoices">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invoiceList.slice(0, 5).map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{invoice.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">{invoice.customer?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(invoice.total_amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      Due: {new Date(invoice.due_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Quotes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Quotes</CardTitle>
          <Link href="/financial/quotes">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quoteList.length > 0 ? (
              quoteList.slice(0, 5).map((quote) => (
                <div key={quote.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <ClipboardList className="h-8 w-8 text-purple-600" />
                    <div>
                      <p className="font-medium">{quote.quote_number}</p>
                      <p className="text-sm text-muted-foreground">{quote.customer?.name ?? "Unknown customer"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={getQuoteStatusColor(quote.status)}>{quote.status}</Badge>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(quote.total_amount ?? 0)}</p>
                      {quote.valid_until ? (
                        <p className="text-xs text-muted-foreground">
                          Expires: {new Date(quote.valid_until).toLocaleDateString()}
                        </p>
                      ) : null}
                    </div>
                    <Link href={`/financial/quotes/${quote.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No quotes on record yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Overdue Alerts */}
      {overdueInvoices.length > 0 || expiringQuotes.length > 0 || overdueQuotes.length > 0 ? (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" /> Attention Needed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {overdueInvoices.length > 0 ? (
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-red-800">
                  <FileText className="h-4 w-4" /> Overdue Invoices
                </h3>
                {overdueInvoices.slice(0, 5).map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between rounded-md border border-red-100 bg-white p-3">
                    <div>
                      <p className="font-medium text-red-800">{invoice.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.customer?.name} • Due {new Date(invoice.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-800">{formatCurrency(invoice.total_amount)}</p>
                      <p className="text-xs text-muted-foreground">{invoice.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {expiringQuotes.length > 0 ? (
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                  <Clock className="h-4 w-4" /> Quotes Expiring Soon
                </h3>
                {expiringQuotes.slice(0, 5).map((quote) => (
                  <div key={quote.id} className="flex items-center justify-between rounded-md border border-blue-100 bg-white p-3">
                    <div>
                      <p className="font-medium text-blue-900">{quote.quote_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {quote.customer?.name ?? "Unknown customer"} • Expires {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getQuoteStatusColor(quote.status)}>{quote.status}</Badge>
                      <p className="text-sm font-semibold text-blue-900">{formatCurrency(quote.total_amount ?? 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {overdueQuotes.length > 0 ? (
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-orange-800">
                  <AlertCircle className="h-4 w-4" /> Quotes Past Validity
                </h3>
                {overdueQuotes.slice(0, 5).map((quote) => (
                  <div key={quote.id} className="flex items-center justify-between rounded-md border border-orange-100 bg-white p-3">
                    <div>
                      <p className="font-medium text-orange-900">{quote.quote_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {quote.customer?.name ?? "Unknown customer"}
                        {quote.valid_until ? ` • Was valid until ${new Date(quote.valid_until).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getQuoteStatusColor(quote.status)}>{quote.status}</Badge>
                      <p className="text-sm font-semibold text-orange-900">{formatCurrency(quote.total_amount ?? 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
