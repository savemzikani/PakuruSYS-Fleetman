import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, ArrowLeft, Phone, Mail, MapPin, Calendar, AlertTriangle, Truck, Package, User } from "lucide-react"
import Link from "next/link"

interface DriverDetailPageProps {
  params: { id: string }
}

export default async function DriverDetailPage({ params }: DriverDetailPageProps) {
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

  // Fetch driver details
  const { data: driver } = await supabase
    .from("drivers")
    .select("*")
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .single()

  if (!driver) {
    redirect("/drivers")
  }

  // Fetch driver's recent loads
  const { data: loads } = await supabase
    .from("loads")
    .select(`
      *,
      customer:customers(name),
      vehicle:vehicles(registration_number)
    `)
    .eq("assigned_driver_id", id)
    .order("created_at", { ascending: false })
    .limit(10)

  // Calculate driver statistics
  const totalLoads = loads?.length || 0
  const pendingLoads = loads?.filter((l) => l.status === "pending").length || 0
  const inTransitLoads = loads?.filter((l) => l.status === "in_transit").length || 0
  const deliveredLoads = loads?.filter((l) => l.status === "delivered").length || 0

  const isLicenseExpiring = (date: string | null) => {
    if (!date) return false
    const expiryDate = new Date(date)
    const today = new Date()
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    return expiryDate <= thirtyDaysFromNow
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
          <Link href="/drivers">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Drivers
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {driver.first_name} {driver.last_name}
            </h1>
            <p className="text-muted-foreground">Driver Details & Performance</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/drivers/${driver.id}/edit`}>
            <Button variant="outline">
              Edit Driver
            </Button>
          </Link>
          <Button variant="outline">
            <Package className="h-4 w-4 mr-2" />
            Assign Load
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Driver Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Driver Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{driver.first_name} {driver.last_name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={driver.is_active ? "default" : "secondary"}>
                          {driver.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {driver.license_expiry && isLicenseExpiring(driver.license_expiry) && (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            License Expiring
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{driver.phone || "Not provided"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{driver.email || "Not provided"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Address</p>
                        <p className="font-medium">{driver.address || "Not provided"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-4">License Information</h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">License Number</p>
                      <p className="font-medium">{driver.license_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">License Expiry</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">
                          {driver.license_expiry ? new Date(driver.license_expiry).toLocaleDateString() : "Not set"}
                        </p>
                        {driver.license_expiry && isLicenseExpiring(driver.license_expiry) && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  {(driver.emergency_contact_name || driver.emergency_contact_phone) && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-4">Emergency Contact</h4>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Name</p>
                          <p className="font-medium">{driver.emergency_contact_name || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-medium">{driver.emergency_contact_phone || "Not provided"}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Loads */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Recent Loads
                </div>
                <Link href={`/loads?driver=${driver.id}`}>
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loads?.slice(0, 5).map((load) => (
                  <div key={load.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Package className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium">{load.load_number}</p>
                        <p className="text-sm text-muted-foreground">{load.customer?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {load.pickup_city} → {load.delivery_city}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(load.status)}>{load.status.replace("_", " ")}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(load.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}

                {(!loads || loads.length === 0) && (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No loads assigned yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistics & Quick Actions */}
        <div className="space-y-6">
          {/* Load Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Load Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Loads</span>
                <span className="text-2xl font-bold">{totalLoads}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Delivered</span>
                <span className="text-lg font-semibold text-green-600">{deliveredLoads}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">In Transit</span>
                <span className="text-lg font-semibold text-purple-600">{inTransitLoads}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending</span>
                <span className="text-lg font-semibold text-yellow-600">{pendingLoads}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href={`/loads/create?driver=${driver.id}`}>
                <Button className="w-full justify-start" variant="outline">
                  <Package className="h-4 w-4 mr-2" />
                  Assign New Load
                </Button>
              </Link>
              <Link href={`/fleet?available=true`}>
                <Button className="w-full justify-start" variant="outline">
                  <Truck className="h-4 w-4 mr-2" />
                  Assign Vehicle
                </Button>
              </Link>
              <Link href={`/drivers/${driver.id}/edit`}>
                <Button className="w-full justify-start" variant="outline">
                  <User className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </Link>
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Contact Driver
              </Button>
            </CardContent>
          </Card>

          {/* Alerts */}
          {driver.license_expiry && isLicenseExpiring(driver.license_expiry) && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-800">License Expiring Soon</h4>
                    <p className="text-sm text-red-700">
                      Driver's license expires on {new Date(driver.license_expiry).toLocaleDateString()}. 
                      Please ensure renewal before this date.
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