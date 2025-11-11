import Link from "next/link"
import { redirect } from "next/navigation"
import { ClipboardList, DollarSign, FileText, Plus, Send } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import type { Quote, QuoteStatus } from "@/lib/types/database"

type QuoteWithRelations = Quote & {
  customer?: { id: string; name: string | null }
  dispatcher?: { first_name: string | null; last_name: string | null }
}

const QUOTE_STATUS_ORDER: QuoteStatus[] = [
  "draft",
  "sent",
  "approved",
  "accepted",
  "rejected",
  "expired",
  "converted",
]

const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
  converted: "Converted",
}

const QUOTE_STATUS_COLOR: Record<QuoteStatus, string> = {
  draft: "bg-slate-100 text-slate-800",
  sent: "bg-blue-100 text-blue-800",
  approved: "bg-emerald-100 text-emerald-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-amber-100 text-amber-800",
  converted: "bg-purple-100 text-purple-800",
}

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(amount)
}

export default async function QuotesPage() {
  const supabase = await createClient()

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, company:companies(*)")
    .eq("id", authUser.id)
    .single()

  if (!profile?.company_id) {
    redirect("/auth/login")
  }

  if (!["super_admin", "company_admin", "manager", "dispatcher"].includes(profile.role)) {
    redirect("/dashboard")
  }

  const { data: quotesData } = await supabase
    .from("quotes")
    .select(
      `*,
        customer:customers(id, name),
        dispatcher:profiles(first_name, last_name)
      `,
    )
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false })

  const quotes = (quotesData ?? []) as QuoteWithRelations[]

  const totalQuotes = quotes.length
  const totalConverted = quotes.filter((quote) => quote.status === "converted").length
  const totalSent = quotes.filter((quote) => quote.status === "sent").length
  const totalDraft = quotes.filter((quote) => quote.status === "draft").length

  const statusCounts = QUOTE_STATUS_ORDER.map((status) => ({
    status,
    count: quotes.filter((quote) => quote.status === status).length,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quotes</h1>
          <p className="text-muted-foreground">Track customer quotes and convert them into loads or invoices.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/financial/quotes/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Quote
            </Button>
          </Link>
          <Link href="/financial/invoices/create">
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuotes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <FileText className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-600">{totalDraft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <Send className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalSent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Converted</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalConverted}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quote Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statusCounts.map(({ status, count }) => (
              <div key={status} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm text-muted-foreground">{QUOTE_STATUS_LABELS[status]}</p>
                  <p className="text-xl font-semibold">{count}</p>
                </div>
                <Badge className={QUOTE_STATUS_COLOR[status]}>{QUOTE_STATUS_LABELS[status]}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {quotes.map((quote) => (
          <Card key={quote.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{quote.quote_number}</h3>
                  <p className="text-sm text-muted-foreground">
                    {quote.customer?.name ?? "Unknown customer"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={QUOTE_STATUS_COLOR[quote.status]}>{QUOTE_STATUS_LABELS[quote.status]}</Badge>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(quote.total_amount, quote.currency)}</p>
                    <p className="text-xs text-muted-foreground">Subtotal {formatCurrency(quote.subtotal, quote.currency)}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Valid Dates</p>
                  <p className="font-medium">
                    {quote.valid_from ? new Date(quote.valid_from).toLocaleDateString() : "Immediate"} -
                    {" "}
                    {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : "Open"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Updated</p>
                  <p className="font-medium">{new Date(quote.updated_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dispatcher</p>
                  <p className="font-medium">
                    {quote.dispatcher
                      ? `${quote.dispatcher.first_name ?? ""} ${quote.dispatcher.last_name ?? ""}`.trim() ||
                        "Unassigned"
                      : "Unassigned"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href={`/financial/quotes/${quote.id}`}>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </Link>
                {quote.status === "draft" && (
                  <Link href={`/financial/quotes/${quote.id}?action=send`}>
                    <Button variant="ghost" size="sm">
                      Send Quote
                    </Button>
                  </Link>
                )}
                {quote.status !== "converted" && (
                  <Link href={`/loads/create?quoteId=${quote.id}&customer=${quote.customer_id}`}>
                    <Button variant="ghost" size="sm">
                      Convert to Load
                    </Button>
                  </Link>
                )}
                <Link href={`/financial/invoices/create?quoteId=${quote.id}&customer=${quote.customer_id}`}>
                  <Button variant="ghost" size="sm">
                    Create Invoice
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}

        {quotes.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No quotes yet</h3>
              <p className="text-muted-foreground mb-4">
                Create a quote to start tracking proposals and converting them into loads or invoices.
              </p>
              <Link href="/financial/quotes/create">
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
