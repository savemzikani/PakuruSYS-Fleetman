import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Package, Plus, Search, MapPin, Clock, Truck } from "lucide-react"
import Link from "next/link"
import type { Load } from "@/lib/types/database"

export default async function LoadsPage() {
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

  // Fetch loads with related data
  const { data: loads } = await supabase
    .from("loads")
    .select(`
      *,
      customer:customers(name),
      vehicle:vehicles(registration_number),
      driver:drivers(first_name, last_name)
    `)
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false })

  // Calculate load statistics
  const totalLoads = loads?.length || 0
  const pendingLoads = loads?.filter((l) => l.status === "pending").length || 0
  const inTransitLoads = loads?.filter((l) => l.status === "in_transit").length || 0
  const deliveredLoads = loads?.filter((l) => l.status === "delivered").length || 0

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

  const formatCurrency = (amount: number | null, currency: string) => {
    if (!amount) return "N/A"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Load Management</h1>
          <p className="text-muted-foreground">Manage shipments, assignments, and tracking</p>
        </div>
        <Link href="/dashboard/loads/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Load
          </Button>
        </Link>
      </div>

      {/* Load Statistics */}
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
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingLoads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{inTransitLoads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{deliveredLoads}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Loads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search by load number, customer, destination..." className="pl-10" />
              </div>
            </div>
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
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

      {/* Load List */}
      <div className="grid gap-4">
        {loads?.map((load: Load) => (
          <Card key={load.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{load.load_number}</h3>
                    <p className="text-muted-foreground">{load.customer?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className={getStatusColor(load.status)}>{load.status.replace("_", " ")}</Badge>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(load.rate, load.currency)}</p>
                    <p className="text-xs text-muted-foreground">{load.currency}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Pickup</p>
                    <p className="text-sm font-medium">{load.pickup_city || load.pickup_address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Delivery</p>
                    <p className="text-sm font-medium">{load.delivery_city || load.delivery_address}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vehicle</p>
                  <p className="text-sm font-medium">{load.vehicle?.registration_number || "Not assigned"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Driver</p>
                  <p className="text-sm font-medium">
                    {load.driver ? `${load.driver.first_name} ${load.driver.last_name}` : "Not assigned"}
                  </p>
                </div>
              </div>

              {load.description && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="text-sm">{load.description}</p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Weight:</span>{" "}
                  <span className="font-medium">{load.weight_kg ? `${load.weight_kg} kg` : "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Volume:</span>{" "}
                  <span className="font-medium">{load.volume_m3 ? `${load.volume_m3} m³` : "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Pickup Date:</span>{" "}
                  <span className="font-medium">
                    {load.pickup_date ? new Date(load.pickup_date).toLocaleDateString() : "TBD"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Delivery Date:</span>{" "}
                  <span className="font-medium">
                    {load.delivery_date ? new Date(load.delivery_date).toLocaleDateString() : "TBD"}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Link href={`/dashboard/loads/${load.id}`}>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </Link>
                {load.status === "pending" && (
                  <Link href={`/dashboard/loads/${load.id}/assign`}>
                    <Button variant="outline" size="sm">
                      Assign Vehicle
                    </Button>
                  </Link>
                )}
                <Link href={`/dashboard/loads/${load.id}/track`}>
                  <Button variant="outline" size="sm">
                    <MapPin className="h-4 w-4 mr-1" />
                    Track
                  </Button>
                </Link>
                <Link href={`/dashboard/loads/${load.id}/edit`}>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!loads || loads.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No loads found</h3>
              <p className="text-muted-foreground mb-4">Get started by creating your first shipment.</p>
              <Link href="/dashboard/loads/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Load
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
