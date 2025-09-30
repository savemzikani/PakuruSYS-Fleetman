import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Plus, TrendingUp, AlertTriangle, Calendar, FileText } from "lucide-react"
import Link from "next/link"
import { FinancialCharts } from "@/components/dashboard/financial-charts"

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
  const [{ data: invoices }, { data: expenses }, { data: loads }] = await Promise.all([
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
      .from("loads")
      .select("rate, currency, status, created_at")
      .eq("company_id", profile.company_id)
      .not("rate", "is", null),
  ])

  // Calculate financial metrics
  const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0
  const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0
  const netProfit = totalRevenue - totalExpenses
  const pendingInvoices = invoices?.filter((inv) => inv.status === "pending") || []
  const overdueInvoices =
    invoices?.filter((inv) => {
      if (inv.status !== "pending") return false
      const dueDate = new Date(inv.due_date)
      return dueDate < new Date()
    }) || []

  const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

  // Prepare chart data
  const monthlyRevenue = invoices?.reduce(
    (acc, invoice) => {
      const month = new Date(invoice.created_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" })
      acc[month] = (acc[month] || 0) + (invoice.total_amount || 0)
      return acc
    },
    {} as Record<string, number>,
  )

  const revenueChartData = Object.entries(monthlyRevenue || {})
    .slice(-6)
    .map(([month, revenue]) => ({
      month,
      revenue: Number(revenue),
    }))

  const statusData = [
    { name: "Paid", value: invoices?.filter((inv) => inv.status === "paid").length || 0, color: "#10b981" },
    { name: "Pending", value: pendingInvoices.length, color: "#f59e0b" },
    { name: "Overdue", value: overdueInvoices.length, color: "#ef4444" },
  ]

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
      <div className="grid gap-4 md:grid-cols-4">
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
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <FinancialCharts 
        revenueData={revenueChartData} 
        statusData={statusData} 
        formatCurrency={formatCurrency} 
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
            {invoices?.slice(0, 5).map((invoice) => (
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

      {/* Overdue Alerts */}
      {overdueInvoices.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Overdue Invoices Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-800 mb-4">
              You have {overdueInvoices.length} overdue invoices totaling {formatCurrency(overdueAmount)}
            </p>
            <div className="space-y-2">
              {overdueInvoices.slice(0, 3).map((invoice) => (
                <div key={invoice.id} className="flex justify-between items-center">
                  <span className="text-sm">
                    {invoice.invoice_number} - {invoice.customer?.name}
                  </span>
                  <span className="text-sm font-medium">{formatCurrency(invoice.total_amount)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link href="/financial/invoices?status=overdue">
                <Button variant="outline" size="sm">
                  View All Overdue
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
