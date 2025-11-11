import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, Calendar, Download, FileText, Mail, Phone, Receipt } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/server"
import type { CurrencyCode, Invoice } from "@/lib/types/database"

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
}

const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-gray-200 text-gray-700",
}

type InvoiceItem = {
  id?: string
  description?: string
  quantity?: number
  unit_price?: number
  total?: number
}

type InvoiceWithRelations = Invoice & {
  customer?: {
    id: string
    name: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    city?: string | null
    country?: string | null
    invoice_delivery_email?: string | null
  }
  load?: { id: string; load_number?: string | null; status?: string | null }
  quote?: { id: string; quote_number?: string | null; status?: string | null }
  items?: unknown
}

const formatCurrency = (amount: number | null | undefined, currency: CurrencyCode | string | null | undefined) => {
  if (amount === null || amount === undefined) return "N/A"

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (currency as CurrencyCode) ?? "USD",
      maximumFractionDigits: 2,
    }).format(amount)
  } catch (error) {
    console.error("Failed to format currency", error)
    return amount.toFixed(2)
  }
}

const formatDate = (value?: string | null) => {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return date.toLocaleDateString()
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string }
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

  if (!["super_admin", "company_admin", "manager"].includes(profile.role)) {
    redirect("/dashboard")
  }

  const { data: invoiceData, error: invoiceError } = await supabase
    .from("invoices")
    .select(
      `*,
      customer:customers(id, name, email, phone, address, city, country, invoice_delivery_email),
      load:loads(id, load_number, status),
      quote:quotes(id, quote_number, status)
    `,
    )
    .eq("company_id", profile.company_id)
    .eq("id", params.id)
    .single()

  if (invoiceError || !invoiceData) {
    notFound()
  }

  const invoice = invoiceData as InvoiceWithRelations

  const invoiceItems: InvoiceItem[] = Array.isArray(invoice.items)
    ? (invoice.items as InvoiceItem[])
    : Array.isArray((invoice.items as { items?: unknown })?.items)
      ? (((invoice.items as { items?: unknown }).items as InvoiceItem[]) ?? [])
      : []

  const statusLabel = STATUS_LABELS[invoice.status] ?? invoice.status
  const statusClass = STATUS_CLASSES[invoice.status] ?? "bg-gray-100 text-gray-800"

  const now = new Date()
  const dueDate = invoice.due_date ? new Date(invoice.due_date) : null
  const isOverdue =
    dueDate !== null &&
    !Number.isNaN(dueDate.getTime()) &&
    invoice.status !== "paid" &&
    invoice.status !== "cancelled" &&
    dueDate < now

  const displayCurrency = invoice.currency ?? "USD"
  const subtotal = Number(invoice.subtotal ?? 0)
  const taxAmount = Number(invoice.tax_amount ?? 0)
  const totalAmount = Number(invoice.total_amount ?? subtotal + taxAmount)
  const taxRate = invoice.tax_rate ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/financial/invoices">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Invoices
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Invoice {invoice.invoice_number}</h1>
            <p className="text-muted-foreground">
              Issued {formatDate(invoice.invoice_date ?? invoice.issue_date)} · Created {formatDate(invoice.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={statusClass}>{isOverdue ? "Overdue" : statusLabel}</Badge>
          {invoice.status !== "paid" && invoice.status !== "cancelled" && (
            <Badge variant="outline" className="font-medium">
              Due {formatDate(invoice.due_date)}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Intentionally using window API in server component wrapper
            }}
            asChild
          >
            <Link href={`/api/pdf/invoice/${invoice.id}`} target="_blank">
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Invoice Date</span>
              <span className="font-medium">{formatDate(invoice.invoice_date ?? invoice.issue_date)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Due Date</span>
              <span className={`font-medium ${isOverdue ? "text-red-600" : ""}`}>{formatDate(invoice.due_date)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Payment Terms</span>
              <span className="font-medium">
                {typeof invoice.payment_terms === "number" ? `${invoice.payment_terms} days` : "—"}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal, displayCurrency)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tax ({Number(taxRate).toFixed(2)}%)</span>
              <span className="font-medium">{formatCurrency(taxAmount, displayCurrency)}</span>
            </div>
            <div className="flex items-center justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatCurrency(totalAmount, displayCurrency)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{invoice.customer?.name ?? "Unknown Customer"}</span>
            </div>
            {invoice.customer?.invoice_delivery_email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{invoice.customer.invoice_delivery_email}</span>
              </div>
            )}
            {invoice.customer?.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Receipt className="h-4 w-4" />
                <span>{invoice.customer.email}</span>
              </div>
            )}
            {invoice.customer?.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{invoice.customer.phone}</span>
              </div>
            )}
            {(invoice.customer?.address || invoice.customer?.city || invoice.customer?.country) && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <Calendar className="mt-0.5 h-4 w-4" />
                <span>
                  {[invoice.customer?.address, invoice.customer?.city, invoice.customer?.country]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {invoice.load ? (
          <Card>
            <CardHeader>
              <CardTitle>Related Load</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Load Number</span>
                <Link href={`/loads/${invoice.load.id}`} className="font-medium text-primary hover:underline">
                  {invoice.load.load_number ?? invoice.load.id}
                </Link>
              </div>
              {invoice.load.status && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className="capitalize">
                    {invoice.load.status.replaceAll("_", " ")}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        {invoice.quote ? (
          <Card>
            <CardHeader>
              <CardTitle>Related Quote</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Quote Number</span>
                <Link href={`/financial/quotes/${invoice.quote.id}`} className="font-medium text-primary hover:underline">
                  {invoice.quote.quote_number ?? invoice.quote.id}
                </Link>
              </div>
              {invoice.quote.status && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className="capitalize">
                    {invoice.quote.status.replaceAll("_", " ")}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          <Badge variant="outline" className="font-mono">
            {invoiceItems.length} items
          </Badge>
        </CardHeader>
        <CardContent>
          {invoiceItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 font-medium">Description</th>
                    <th className="py-2 font-medium">Quantity</th>
                    <th className="py-2 font-medium">Unit Price</th>
                    <th className="py-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceItems.map((item, index) => (
                    <tr key={item.id ?? index} className="border-t">
                      <td className="py-2">{item.description ?? "—"}</td>
                      <td className="py-2">{Number(item.quantity ?? 0).toLocaleString()}</td>
                      <td className="py-2">{formatCurrency(Number(item.unit_price ?? 0), displayCurrency)}</td>
                      <td className="py-2 font-medium">{formatCurrency(Number(item.total ?? 0), displayCurrency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No invoice items were recorded.</p>
          )}
        </CardContent>
      </Card>

      {invoice.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{invoice.notes}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
