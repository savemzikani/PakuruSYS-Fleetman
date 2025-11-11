import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  ClipboardList,
  DollarSign,
  Edit,
  FileText,
  Mail,
  MapPin,
  Phone,
  Plus,
  Send,
  Truck,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/server"
import type { Quote, QuoteItem, QuoteStatus } from "@/lib/types/database"
import { QuoteTotalsAlert } from "@/components/financial/quote-totals-alert"
import { QuoteSendDialog } from "@/components/financial/quote-send-dialog"

type RelatedInvoice = {
  id: string
  invoice_number: string
  status: string
  total_amount: number | null
  currency: string | null
}

const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
  converted: "Converted",
}

const STATUS_CLASSES: Record<QuoteStatus, string> = {
  draft: "bg-slate-100 text-slate-800",
  sent: "bg-blue-100 text-blue-800",
  approved: "bg-emerald-100 text-emerald-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-amber-100 text-amber-800",
  converted: "bg-purple-100 text-purple-800",
}

const formatCurrency = (amount: number | null | undefined, currency: string | null | undefined) => {
  if (amount === null || amount === undefined) return "N/A"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(amount)
}

export default async function QuoteDetailPage({
  params,
  searchParams,
}: {
  params: { quoteId: string }
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
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

  const { data: quoteData, error: quoteError } = await supabase
    .from("quotes")
    .select(
      `*,
      customer:customers(id, name, email, phone, address, city, country, invoice_delivery_email),
      dispatcher:profiles(first_name, last_name),
      converted_load:loads(id, load_number, status),
      items:quote_items(id, line_number, description, quantity, unit_price, line_total)
    `,
    )
    .eq("company_id", profile.company_id)
    .eq("id", params.quoteId)
    .single()

  if (quoteError || !quoteData) {
    notFound()
  }

  const quote = quoteData as Quote & {
    customer?: { id: string; name: string | null; email?: string | null; phone?: string | null; address?: string | null; city?: string | null; country?: string | null }
    dispatcher?: { first_name: string | null; last_name: string | null }
    converted_load?: { id: string; load_number: string | null; status: string | null }
    items?: QuoteItem[]
  }

  const { data: relatedInvoicesData } = await supabase
    .from("invoices")
    .select("id, invoice_number, status, total_amount, currency")
    .eq("company_id", profile.company_id)
    .eq("quote_id", quote.id)
    .order("created_at", { ascending: false })

  const relatedInvoices = (relatedInvoicesData ?? []) as RelatedInvoice[]

  const statusClass = STATUS_CLASSES[quote.status as QuoteStatus]
  const statusLabel = STATUS_LABELS[quote.status as QuoteStatus]

  const dispatcherName = quote.dispatcher
    ? `${quote.dispatcher.first_name ?? ""} ${quote.dispatcher.last_name ?? ""}`.trim() || "Unassigned"
    : "Unassigned"

  const quoteItems = (quote.items ?? []).slice().sort((a, b) => (a.line_number ?? 0) - (b.line_number ?? 0))

  const calculatedSubtotal = quoteItems.reduce((sum, item) => {
    const quantity = Number(item.quantity ?? 0) || 0
    const unitPrice = Number(item.unit_price ?? 0) || 0
    const lineTotal = Number(item.line_total ?? quantity * unitPrice) || 0
    return sum + lineTotal
  }, 0)

  const taxRateNumeric = Number(quote.tax_rate ?? 0)
  const calculatedTaxAmount = Number.isFinite(taxRateNumeric) ? calculatedSubtotal * (taxRateNumeric / 100) : 0
  const calculatedTotalAmount = calculatedSubtotal + calculatedTaxAmount

  const totalsOutOfSync =
    Math.abs(Number(quote.subtotal ?? 0) - calculatedSubtotal) > 0.01 ||
    Math.abs(Number(quote.tax_amount ?? 0) - calculatedTaxAmount) > 0.01 ||
    Math.abs(Number(quote.total_amount ?? 0) - calculatedTotalAmount) > 0.01

  const shouldOpenSendDialog = (() => {
    const actionParam = searchParams?.action
    if (Array.isArray(actionParam)) {
      return actionParam.includes("send")
    }
    return actionParam === "send"
  })()

  return (
    <div className="space-y-6">
      <QuoteSendDialog
        quoteId={quote.id}
        quoteNumber={quote.quote_number}
        status={quote.status as QuoteStatus}
        totalAmount={Number(quote.total_amount ?? 0)}
        currency={quote.currency ?? "USD"}
        customerName={quote.customer?.name}
        customerEmail={quote.customer?.email}
        deliveryEmail={quote.customer?.invoice_delivery_email}
        companyName={profile.company?.name}
        basePath={`/financial/quotes/${quote.id}`}
        initialOpen={shouldOpenSendDialog}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/financial/quotes">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Quotes
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Quote {quote.quote_number}</h1>
            <p className="text-muted-foreground">Created on {new Date(quote.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={statusClass}>{statusLabel}</Badge>
          <Link href={`/financial/quotes/${quote.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit Quote
            </Button>
          </Link>
          <Link href={`/financial/quotes/${quote.id}?action=send`}>
            <Button variant="outline" size="sm">
              <Send className="mr-2 h-4 w-4" />
              Send Quote
            </Button>
          </Link>
          {quote.status !== "converted" && (
            <Link href={`/loads/create?quoteId=${quote.id}&customer=${quote.customer_id}`}>
              <Button variant="ghost" size="sm">
                <Truck className="mr-2 h-4 w-4" />
                Convert to Load
              </Button>
            </Link>
          )}
          <Link href={`/financial/invoices/create?quoteId=${quote.id}&customer=${quote.customer_id}`}>
            <Button variant="ghost" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </Link>
        </div>
      </div>

      {totalsOutOfSync ? (
        <QuoteTotalsAlert
          quoteId={quote.id}
          currency={quote.currency ?? "USD"}
          storedSubtotal={Number(quote.subtotal ?? 0)}
          storedTaxAmount={Number(quote.tax_amount ?? 0)}
          storedTotalAmount={Number(quote.total_amount ?? 0)}
          calculatedSubtotal={Number(calculatedSubtotal.toFixed(2))}
          calculatedTaxAmount={Number(calculatedTaxAmount.toFixed(2))}
          calculatedTotalAmount={Number(calculatedTotalAmount.toFixed(2))}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{quote.customer?.name ?? "Unknown Customer"}</span>
            </div>
            {quote.customer?.email ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{quote.customer.email}</span>
              </div>
            ) : null}
            {quote.customer?.phone ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{quote.customer.phone}</span>
              </div>
            ) : null}
            {(quote.customer?.address || quote.customer?.city || quote.customer?.country) && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4" />
                <span>
                  {[quote.customer?.address, quote.customer?.city, quote.customer?.country].filter(Boolean).join(", ")}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(quote.subtotal, quote.currency)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tax ({Number(quote.tax_rate ?? 0).toFixed(2)}%)</span>
              <span className="font-medium">{formatCurrency(quote.tax_amount, quote.currency)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatCurrency(quote.total_amount, quote.currency)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Dispatcher</span>
              <span className="font-medium">{dispatcherName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Valid Dates</span>
              <span className="font-medium">
                {quote.valid_from ? new Date(quote.valid_from).toLocaleDateString() : "Immediate"} – {" "}
                {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : "Open"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          <Badge variant="outline" className="font-mono">
            {quoteItems.length} items
          </Badge>
        </CardHeader>
        <CardContent>
          {quoteItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 font-medium">Item</th>
                    <th className="py-2 font-medium">Description</th>
                    <th className="py-2 font-medium">Quantity</th>
                    <th className="py-2 font-medium">Unit Price</th>
                    <th className="py-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quoteItems.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="py-2 font-medium">{item.line_number}</td>
                      <td className="py-2">{item.description}</td>
                      <td className="py-2">{Number(item.quantity ?? 0).toLocaleString()}</td>
                      <td className="py-2">{formatCurrency(Number(item.unit_price ?? 0), quote.currency)}</td>
                      <td className="py-2 font-medium">
                        {formatCurrency(Number(item.line_total ?? 0), quote.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No line items recorded for this quote.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {quote.notes ? <p className="whitespace-pre-wrap text-sm">{quote.notes}</p> : <p className="text-sm text-muted-foreground">No additional notes.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Related Records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Converted Load</span>
              {quote.converted_load ? (
                <Link href={`/loads/${quote.converted_load.id}`} className="font-medium text-primary hover:underline">
                  {quote.converted_load.load_number ?? quote.converted_load.id}
                </Link>
              ) : (
                <span className="font-medium text-muted-foreground">Not converted</span>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground">Invoices</p>
              {relatedInvoices && relatedInvoices.length > 0 ? (
                <ul className="space-y-2">
                  {relatedInvoices.map((invoice: RelatedInvoice) => (
                    <li key={invoice.id} className="flex items-center justify-between rounded border px-3 py-2">
                      <div>
                        <p className="font-medium">{invoice.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">{invoice.status}</p>
                      </div>
                      <span className="font-semibold">
                        {formatCurrency(invoice.total_amount ?? 0, invoice.currency ?? quote.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No invoices linked yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Created {new Date(quote.created_at).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Updated {new Date(quote.updated_at).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>ID: {quote.id}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span>Currency: {quote.currency}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
