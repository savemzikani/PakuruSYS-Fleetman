import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calculator, ArrowLeft, Edit, FileDown, XCircle, Send } from "lucide-react"
import Link from "next/link"
import { QuoteActions } from "@/components/quotes/quote-actions"

interface QuoteDetailPageProps {
  params: { id: string }
}

export default async function QuoteDetailPage({ params }: QuoteDetailPageProps) {
  const { id } = await params
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

  // Fetch quote details
  const { data: quote } = await supabase
    .from("quotes")
    .select(`
      *,
      customer:customers(*),
      load:loads(load_number, pickup_address, delivery_address),
      company:companies(*)
    `)
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .single()

  if (!quote) {
    redirect("/quotes")
  }

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

  const currentStatus = isExpired(quote.valid_until, quote.status) ? "expired" : quote.status

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/quotes">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Quotes
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{quote.quote_number}</h1>
            <p className="text-muted-foreground">Quote Details & Status</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/quotes/${quote.id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit Quote
            </Button>
          </Link>
          <QuoteActions id={quote.id} status={quote.status} convertedToInvoiceId={quote.converted_to_invoice_id} />
          <Link href={`/api/pdf/quote/${quote.id}`} prefetch={false}>
            <Button variant="outline">
              <FileDown className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quote Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Quote Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                      <Calculator className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{quote.quote_number}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getStatusColor(currentStatus)}>
                          {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                        </Badge>
                        {currentStatus === "expired" && (
                          <Badge variant="destructive">
                            Action Required
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <p className="font-medium">{quote.customer?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Quote Date</p>
                      <p className="font-medium">{new Date(quote.quote_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Valid Until</p>
                      <p className="font-medium">{new Date(quote.valid_until).toLocaleDateString()}</p>
                      {isExpired(quote.valid_until, quote.status) && (
                        <p className="text-sm text-red-600">Expired {Math.floor((Date.now() - new Date(quote.valid_until).getTime()) / (1000 * 60 * 60 * 24))} days ago</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-4">Customer Information</h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Contact Person</p>
                      <p className="font-medium">{quote.customer?.contact_person || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{quote.customer?.email || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{quote.customer?.phone || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">
                        {quote.customer?.address ? 
                          `${quote.customer.address}, ${quote.customer.city || ''}, ${quote.customer.country || ''}`.replace(/,\s*,/g, ',').replace(/,\s*$/, '') : 
                          "Not provided"
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {quote.load && (
                <div className="mt-6 border-t pt-6">
                  <h4 className="font-semibold mb-4">Related Load</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Load Number</p>
                      <p className="font-medium">{quote.load.load_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Route</p>
                      <p className="font-medium">{quote.load.pickup_address} → {quote.load.delivery_address}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quote Items (Placeholder) */}
          <Card>
            <CardHeader>
              <CardTitle>Quote Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* In a real implementation, you would fetch quote items from a separate table */}
                <div className="grid grid-cols-12 gap-4 text-sm font-medium border-b pb-2">
                  <div className="col-span-6">Description</div>
                  <div className="col-span-2">Quantity</div>
                  <div className="col-span-2">Unit Price</div>
                  <div className="col-span-2">Total</div>
                </div>
                
                <div className="grid grid-cols-12 gap-4 text-sm py-2">
                  <div className="col-span-6">Transportation Services</div>
                  <div className="col-span-2">1</div>
                  <div className="col-span-2">{formatCurrency(quote.subtotal, quote.currency)}</div>
                  <div className="col-span-2">{formatCurrency(quote.subtotal, quote.currency)}</div>
                </div>

                {/* Quote Totals */}
                <div className="border-t pt-4">
                  <div className="flex justify-end">
                    <div className="w-80 space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-medium">{formatCurrency(quote.subtotal, quote.currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax:</span>
                        <span className="font-medium">{formatCurrency(quote.tax_amount, quote.currency)}</span>
                      </div>
                      <div className="border-t pt-2">
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total:</span>
                          <span>{formatCurrency(quote.total_amount, quote.currency)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terms and Notes */}
          {(quote.terms || quote.notes) && (
            <Card>
              <CardHeader>
                <CardTitle>Terms & Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {quote.terms && (
                  <div>
                    <h4 className="font-semibold mb-2">Terms & Conditions</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.terms}</p>
                  </div>
                )}
                {quote.notes && (
                  <div>
                    <h4 className="font-semibold mb-2">Internal Notes</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Status & Quick Actions */}
        <div className="space-y-6">
          {/* Quote Status */}
          <Card>
            <CardHeader>
              <CardTitle>Quote Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Status</span>
                <Badge className={getStatusColor(currentStatus)}>
                  {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Value</span>
                <span className="text-lg font-semibold">{formatCurrency(quote.total_amount, quote.currency)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Valid For</span>
                <span className="text-sm font-medium">
                  {isExpired(quote.valid_until, quote.status) ? 
                    "Expired" : 
                    `${Math.ceil((new Date(quote.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days`
                  }
                </span>
              </div>

              {quote.converted_to_invoice_id && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Converted to Invoice</span>
                  <Link href={`/financial/invoices/${quote.converted_to_invoice_id}`}>
                    <Button variant="outline" size="sm">
                      View Invoice
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href={`/quotes/${quote.id}/edit`}>
                <Button className="w-full justify-start" variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Quote
                </Button>
              </Link>
              
              <QuoteActions id={quote.id} status={quote.status} convertedToInvoiceId={quote.converted_to_invoice_id} />

              <Button className="w-full justify-start" variant="outline">
                <FileDown className="h-4 w-4 mr-2" />
                Download PDF
              </Button>

              <Link href={`/quotes/add?customer=${quote.customer_id}`}>
                <Button className="w-full justify-start" variant="outline">
                  <Calculator className="h-4 w-4 mr-2" />
                  Create Similar Quote
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Alerts */}
          {currentStatus === "expired" && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-800">Quote Expired</h4>
                    <p className="text-sm text-yellow-700">
                      This quote expired on {new Date(quote.valid_until).toLocaleDateString()}. 
                      Consider creating a new quote or extending the validity period.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {quote.status === "sent" && !isExpired(quote.valid_until, quote.status) && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Send className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-800">Quote Pending</h4>
                    <p className="text-sm text-blue-700">
                      This quote is waiting for customer response. 
                      Valid until {new Date(quote.valid_until).toLocaleDateString()}.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}