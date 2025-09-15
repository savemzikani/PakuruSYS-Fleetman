import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Building2, Mail, Phone, MapPin, CreditCard, Calendar, Package } from "lucide-react"
import Link from "next/link"

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
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
  if (!["super_admin", "company_admin", "manager", "dispatcher"].includes(profile.role)) {
    redirect("/dashboard")
  }

  // Fetch customer details
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .single()

  if (!customer) {
    redirect("/customers")
  }

  // Fetch customer loads
  const { data: loads } = await supabase
    .from("loads")
    .select(`
      *,
      vehicle:vehicles(registration_number),
      driver:drivers(first_name, last_name)
    `)
    .eq("customer_id", id)
    .order("created_at", { ascending: false })
    .limit(10)

  // Fetch customer invoices
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("customer_id", id)
    .order("created_at", { ascending: false })
    .limit(10)

  // Calculate statistics
  const totalLoads = loads?.length || 0
  const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0
  const pendingInvoices = invoices?.filter((inv) => inv.status === "pending").length || 0
  const overdueInvoices =
    invoices?.filter((inv) => {
      if (inv.status !== "pending") return false
      const dueDate = new Date(inv.due_date)
      return dueDate < new Date()
    }).length || 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "assigned":
        return "bg-blue-100 text-blue-800"
      case "in_transit":
        return "bg-purple-100 text-purple-800"
      case "delivered":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/customers">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customers
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{customer.name}</h1>
            <p className="text-muted-foreground">{customer.contact_person || "No contact person"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={customer.is_active ? "default" : "secondary"}>
            {customer.is_active ? "Active" : "Inactive"}
          </Badge>
          <Link href={`/customers/${customer.id}/edit`}>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit Customer
            </Button>
          </Link>
        </div>
      </div>

      {/* Customer Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Loads</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLoads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingInvoices}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <div className="h-2 w-2 bg-red-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueInvoices}</div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-2">Contact Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.email || "Not provided"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.phone || "Not provided"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {customer.city && customer.country ? `${customer.city}, ${customer.country}` : "Not provided"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Business Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax Number:</span>
                    <span className="font-medium">{customer.tax_number || "Not provided"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Credit Limit:</span>
                    <span className="font-medium">{formatCurrency(customer.credit_limit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Terms:</span>
                    <span className="font-medium">{customer.payment_terms} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={customer.is_active ? "default" : "secondary"}>
                      {customer.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {customer.address && (
              <div>
                <h4 className="font-semibold mb-2">Address</h4>
                <p className="text-sm text-muted-foreground">
                  {customer.address}
                  {customer.postal_code && `, ${customer.postal_code}`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Account Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <div>
                  <p className="text-sm font-medium">Customer Created</p>
                  <p className="text-xs text-muted-foreground">{new Date(customer.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              {loads && loads.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <div>
                    <p className="text-sm font-medium">First Load</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(loads[loads.length - 1].created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
              {loads && loads.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  <div>
                    <p className="text-sm font-medium">Latest Load</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(loads[0].created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Loads */}
      {loads && loads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Loads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loads.slice(0, 5).map((load) => (
                <div key={load.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Package className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">{load.load_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {load.pickup_city} → {load.delivery_city}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={getStatusColor(load.status)}>{load.status.replace("_", " ")}</Badge>
                    <div className="text-right">
                      <p className="text-sm font-medium">{load.rate ? formatCurrency(load.rate) : "No rate set"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(load.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {loads.length > 5 && (
              <div className="mt-4 text-center">
                <Link href={`/loads?customer=${customer.id}`}>
                  <Button variant="outline">View All Loads</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <Package className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Create Load</h3>
            <p className="text-sm text-muted-foreground mb-4">Create a new shipment for this customer</p>
            <Link href={`/loads/create?customer=${customer.id}`}>
              <Button variant="outline" size="sm">
                Create Load
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <CreditCard className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Generate Invoice</h3>
            <p className="text-sm text-muted-foreground mb-4">Create an invoice for this customer</p>
            <Button variant="outline" size="sm">
              Generate Invoice
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <Mail className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Send Statement</h3>
            <p className="text-sm text-muted-foreground mb-4">Email account statement to customer</p>
            <Button variant="outline" size="sm">
              Send Statement
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
