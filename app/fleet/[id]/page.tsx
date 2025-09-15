import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Calendar, FileText, AlertTriangle, Wrench, Truck } from "lucide-react"
import Link from "next/link"

interface VehicleDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function VehicleDetailPage({ params }: VehicleDetailPageProps) {
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

  // Fetch vehicle details
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .single()

  if (!vehicle) {
    redirect("/fleet")
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "maintenance":
        return "bg-yellow-100 text-yellow-800"
      case "out_of_service":
        return "bg-red-100 text-red-800"
      case "retired":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "maintenance":
        return <Wrench className="h-6 w-6" />
      case "out_of_service":
        return <AlertTriangle className="h-6 w-6" />
      default:
        return <Truck className="h-6 w-6" />
    }
  }

  const isExpiringOrExpired = (date: string | null) => {
    if (!date) return false
    const expiryDate = new Date(date)
    const today = new Date()
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    return expiryDate <= thirtyDaysFromNow
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/fleet">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Fleet
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{vehicle.registration_number}</h1>
            <p className="text-muted-foreground">
              {vehicle.make} {vehicle.model} {vehicle.year && `(${vehicle.year})`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(vehicle.status)}>{vehicle.status.replace("_", " ")}</Badge>
          <Link href={`/fleet/${vehicle.id}/edit`}>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit Vehicle
            </Button>
          </Link>
        </div>
      </div>

      {/* Vehicle Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(vehicle.status)}
            Vehicle Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <h3 className="font-semibold mb-3">Basic Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registration:</span>
                  <span className="font-medium">{vehicle.registration_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Make:</span>
                  <span className="font-medium">{vehicle.make || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model:</span>
                  <span className="font-medium">{vehicle.model || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Year:</span>
                  <span className="font-medium">{vehicle.year || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capacity:</span>
                  <span className="font-medium">{vehicle.capacity_tons ? `${vehicle.capacity_tons}T` : "N/A"}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Technical Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VIN:</span>
                  <span className="font-medium text-xs">{vehicle.vin || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Engine:</span>
                  <span className="font-medium text-xs">{vehicle.engine_number || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fuel Type:</span>
                  <span className="font-medium capitalize">{vehicle.fuel_type || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Odometer:</span>
                  <span className="font-medium">{vehicle.odometer_reading?.toLocaleString() || "0"} km</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Compliance Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Insurance:</span>
                  <div className="text-right">
                    <span className="font-medium text-sm">
                      {vehicle.insurance_expiry ? new Date(vehicle.insurance_expiry).toLocaleDateString() : "Not set"}
                    </span>
                    {vehicle.insurance_expiry && isExpiringOrExpired(vehicle.insurance_expiry) && (
                      <AlertTriangle className="h-4 w-4 text-red-500 inline ml-1" />
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">License:</span>
                  <div className="text-right">
                    <span className="font-medium text-sm">
                      {vehicle.license_expiry ? new Date(vehicle.license_expiry).toLocaleDateString() : "Not set"}
                    </span>
                    {vehicle.license_expiry && isExpiringOrExpired(vehicle.license_expiry) && (
                      <AlertTriangle className="h-4 w-4 text-red-500 inline ml-1" />
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Service:</span>
                  <span className="font-medium text-sm">
                    {vehicle.last_service_date ? new Date(vehicle.last_service_date).toLocaleDateString() : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Next Service:</span>
                  <div className="text-right">
                    <span className="font-medium text-sm">
                      {vehicle.next_service_due
                        ? new Date(vehicle.next_service_due).toLocaleDateString()
                        : "Not scheduled"}
                    </span>
                    {vehicle.next_service_due && isExpiringOrExpired(vehicle.next_service_due) && (
                      <Wrench className="h-4 w-4 text-yellow-500 inline ml-1" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <Calendar className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Schedule Service</h3>
            <p className="text-sm text-muted-foreground mb-4">Book maintenance or service appointment</p>
            <Button variant="outline" size="sm">
              Schedule Now
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <FileText className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">View Documents</h3>
            <p className="text-sm text-muted-foreground mb-4">Insurance, registration, service records</p>
            <Button variant="outline" size="sm">
              View Documents
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <Truck className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Assign to Load</h3>
            <p className="text-sm text-muted-foreground mb-4">Assign this vehicle to a shipment</p>
            <Button variant="outline" size="sm">
              Assign Load
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(isExpiringOrExpired(vehicle.insurance_expiry) ||
        isExpiringOrExpired(vehicle.license_expiry) ||
        isExpiringOrExpired(vehicle.next_service_due)) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {isExpiringOrExpired(vehicle.insurance_expiry) && (
                <p className="text-sm text-yellow-800">
                  • Insurance expires on {new Date(vehicle.insurance_expiry!).toLocaleDateString()}
                </p>
              )}
              {isExpiringOrExpired(vehicle.license_expiry) && (
                <p className="text-sm text-yellow-800">
                  • License expires on {new Date(vehicle.license_expiry!).toLocaleDateString()}
                </p>
              )}
              {isExpiringOrExpired(vehicle.next_service_due) && (
                <p className="text-sm text-yellow-800">
                  • Service due on {new Date(vehicle.next_service_due!).toLocaleDateString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
