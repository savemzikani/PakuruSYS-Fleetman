import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calculator, Plus, Search, Send, Eye, Edit, FileDown } from "lucide-react"
import Link from "next/link"
import type { Quote } from "@/lib/types/database"

export default async function QuotesPage() {
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

  // Fetch quotes with related data
  const { data: quotes } = await supabase
    .from("quotes")
    .select(`
      *,
      customer:customers(name),
      load:loads(load_number)
    `)
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false })

  // Calculate quote statistics
  const totalQuotes = quotes?.length || 0
  const draftQuotes = quotes?.filter((q) => q.status === "draft").length || 0
  const sentQuotes = quotes?.filter((q) => q.status === "sent").length || 0
  const acceptedQuotes = quotes?.filter((q) => q.status === "accepted").length || 0
  const rejectedQuotes = quotes?.filter((q) => q.status === "rejected").length || 0
  const expiredQuotes = quotes?.filter((q) => {
    if (q.status !== "sent") return false
    return new Date(q.valid_until) < new Date()
  }).length || 0

  const totalValue = quotes?.reduce((sum, quote) => sum + (quote.total_amount || 0), 0) || 0
  const acceptedValue = quotes?.filter((q) => q.status === "accepted").reduce((sum, quote) => sum + (quote.total_amount || 0), 0) || 0

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800"
      case "sent":
        return "bg-blue-100 text-blue-800"
      case "accepted":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      case "expired":
        return "bg-yellow-100 text-yellow-800"
      case "converted":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const isExpired = (validUntil: string, status: string) => {
    return status === "sent" && new Date(validUntil) < new Date()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quote Management</h1>
          <p className="text-muted-foreground">Create, send, and manage quotes for your customers</p>
        </div>
        <Link href="/quotes/add">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Quote
          </Button>
        </Link>
      </div>

      {/* Quote Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuotes}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(totalValue)} total value
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{acceptedQuotes}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(acceptedValue)} value
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{sentQuotes}</div>
            <p className="text-xs text-muted-foreground">Sent to customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{expiredQuotes}</div>
            <p className="text-xs text-muted-foreground">Need follow-up</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search by quote number, customer, or load..." className="pl-10" />
              </div>
            </div>
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
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

      {/* Quote List */}
      <div className="grid gap-4">
        {quotes?.map((quote: Quote) => (
          <Card key={quote.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Calculator className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{quote.quote_number}</h3>
                    <p className="text-muted-foreground">{quote.customer?.name}</p>
                    {quote.load?.load_number && (
                      <p className="text-sm text-muted-foreground">Load: {quote.load.load_number}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-semibold">{formatCurrency(quote.total_amount, quote.currency)}</p>
                    <p className="text-xs text-muted-foreground">
                      Valid until {new Date(quote.valid_until).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Badge className={getStatusColor(isExpired(quote.valid_until, quote.status) ? "expired" : quote.status)}>
                      {isExpired(quote.valid_until, quote.status) ? "Expired" : quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3 mb-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Quote Date:</span>{" "}
                  <span className="font-medium">{new Date(quote.quote_date).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Subtotal:</span>{" "}
                  <span className="font-medium">{formatCurrency(quote.subtotal, quote.currency)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tax:</span>{" "}
                  <span className="font-medium">{formatCurrency(quote.tax_amount, quote.currency)}</span>
                </div>
              </div>

              {quote.notes && (
                <div className="mb-4 text-sm">
                  <span className="text-muted-foreground">Notes:</span>{" "}
                  <span className="font-medium">{quote.notes}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Link href={`/quotes/${quote.id}`}>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </Link>
                <Link href={`/quotes/${quote.id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </Link>
                {quote.status === "draft" && (
                  <Button variant="outline" size="sm">
                    <Send className="h-4 w-4 mr-1" />
                    Send Quote
                  </Button>
                )}
                {quote.status === "accepted" && !quote.converted_to_invoice_id && (
                  <Button variant="outline" size="sm">
                    <FileDown className="h-4 w-4 mr-1" />
                    Convert to Invoice
                  </Button>
                )}
                <Button variant="outline" size="sm">
                  <FileDown className="h-4 w-4 mr-1" />
                  Download PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!quotes || quotes.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No quotes found</h3>
              <p className="text-muted-foreground mb-4">Get started by creating your first quote.</p>
              <Link href="/quotes/add">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Quote
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}