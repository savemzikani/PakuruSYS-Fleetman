import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar, DollarSign, Edit, MapPin, Package, Truck, User } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { LoadAssignButton, LoadEditButton } from "@/components/loads/load-modal-buttons"
import type { LoadTracking } from "@/lib/types/database"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface LoadDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function LoadDetailPage({ params }: LoadDetailPageProps) {
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

  // Fetch load details with related data
  const { data: load } = await supabase
    .from("loads")
    .select(`
      *,
      customer:customers(*),
      vehicle:vehicles(*),
      driver:drivers(*),
      dispatcher:profiles!loads_dispatcher_id_fkey(first_name, last_name)
    `)
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .single()

  if (!load) {
    redirect("/loads")
  }

  // Fetch load tracking history
  const { data: trackingHistory } = await supabase
    .from("load_tracking")
    .select(`
      *,
      updated_by_profile:profiles!load_tracking_updated_by_fkey(first_name, last_name)
    `)
    .eq("load_id", id)
    .order("created_at", { ascending: false })

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
        <div className="flex items-center gap-4">
          <Link href="/loads">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Loads
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{load.load_number}</h1>
            <p className="text-muted-foreground">{load.customer?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(load.status)}>{load.status.replace("_", " ")}</Badge>
          <LoadEditButton loadId={load.id}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Load
          </LoadEditButton>
        </div>
      </div>

      {/* Load Overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Load Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-2">Basic Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Load Number:</span>
                    <span className="font-medium">{load.load_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge className={getStatusColor(load.status)} variant="secondary">
                      {load.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate:</span>
                    <span className="font-medium">{formatCurrency(load.rate, load.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Weight:</span>
                    <span className="font-medium">{load.weight_kg ? `${load.weight_kg} kg` : "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Volume:</span>
                    <span className="font-medium">{load.volume_m3 ? `${load.volume_m3} m³` : "N/A"}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Assignment</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vehicle:</span>
                    <span className="font-medium">{load.vehicle?.registration_number || "Not assigned"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Driver:</span>
                    <span className="font-medium">
                      {load.driver ? `${load.driver.first_name} ${load.driver.last_name}` : "Not assigned"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dispatcher:</span>
                    <span className="font-medium">
                      {load.dispatcher ? `${load.dispatcher.first_name} ${load.dispatcher.last_name}` : "Not assigned"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {load.description && (
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">{load.description}</p>
              </div>
            )}

            {load.special_instructions && (
              <div>
                <h4 className="font-semibold mb-2">Special Instructions</h4>
                <p className="text-sm text-muted-foreground">{load.special_instructions}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Route Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2 text-green-600">Pickup Location</h4>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{load.pickup_address}</p>
                <p className="text-muted-foreground">
                  {load.pickup_city}
                  {load.pickup_country && `, ${load.pickup_country}`}
                </p>
                {load.pickup_date && (
                  <p className="text-muted-foreground">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    {new Date(load.pickup_date).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div className="border-l-2 border-dashed border-muted-foreground/30 pl-4 ml-2">
              <div className="h-8"></div>
            </div>

            <div>
              <h4 className="font-semibold mb-2 text-red-600">Delivery Location</h4>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{load.delivery_address}</p>
                <p className="text-muted-foreground">
                  {load.delivery_city}
                  {load.delivery_country && `, ${load.delivery_country}`}
                </p>
                {load.delivery_date && (
                  <p className="text-muted-foreground">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    {new Date(load.delivery_date).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Information */}
      {load.customer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Company Name</p>
                <p className="font-medium">{load.customer.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contact Person</p>
                <p className="font-medium">{load.customer.contact_person || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{load.customer.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{load.customer.phone || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tracking History */}
      {trackingHistory && trackingHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tracking History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trackingHistory.map((tracking: LoadTracking, index: number) => (
                <div key={tracking.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${index === 0 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                    {index < trackingHistory.length - 1 && <div className="w-px h-8 bg-muted-foreground/30 mt-2" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getStatusColor(tracking.status)} variant="secondary">
                        {tracking.status.replace("_", " ")}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(tracking.created_at).toLocaleString()}
                      </span>
                    </div>
                    {tracking.location && (
                      <p className="text-sm font-medium mb-1">
                        <MapPin className="h-4 w-4 inline mr-1" />
                        {tracking.location}
                      </p>
                    )}
                    {tracking.notes && <p className="text-sm text-muted-foreground">{tracking.notes}</p>}
                    {tracking.updated_by_profile && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Updated by {tracking.updated_by_profile.first_name} {tracking.updated_by_profile.last_name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        {load.status === "pending" && (
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <Truck className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Assign Vehicle</h3>
              <p className="text-sm text-muted-foreground mb-4">Assign a vehicle and driver to this load</p>
              <LoadAssignButton loadId={load.id} variant="outline" size="sm">
                Assign Now
              </LoadAssignButton>
            </CardContent>
          </Card>
        )}

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <MapPin className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Track Load</h3>
            <p className="text-sm text-muted-foreground mb-4">View real-time tracking and updates</p>
            <Link href={`/loads/${load.id}/track`}>
              <Button variant="outline" size="sm">
                Track Now
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <DollarSign className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Generate Invoice</h3>
            <p className="text-sm text-muted-foreground mb-4">Create invoice for this shipment</p>
            <Button variant="outline" size="sm">
              Generate Invoice
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
