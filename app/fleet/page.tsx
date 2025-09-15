import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Truck, Plus, Search, Calendar, Wrench, AlertTriangle } from "lucide-react"
import Link from "next/link"
import type { Vehicle } from "@/lib/types/database"

export default async function FleetPage() {
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

  // Fetch vehicles
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false })

  // Calculate fleet statistics
  const totalVehicles = vehicles?.length || 0
  const activeVehicles = vehicles?.filter((v) => v.status === "active").length || 0
  const maintenanceVehicles = vehicles?.filter((v) => v.status === "maintenance").length || 0
  const outOfServiceVehicles = vehicles?.filter((v) => v.status === "out_of_service").length || 0

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
        return <Wrench className="h-4 w-4" />
      case "out_of_service":
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Truck className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fleet Management</h1>
          <p className="text-muted-foreground">Manage your vehicles, maintenance, and assignments</p>
        </div>
        <Link href="/fleet/add">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Vehicle
          </Button>
        </Link>
      </div>

      {/* Fleet Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVehicles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeVehicles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{maintenanceVehicles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Service</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfServiceVehicles}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Vehicles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search by registration, make, model..." className="pl-10" />
              </div>
            </div>
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="out_of_service">Out of Service</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by make" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Makes</SelectItem>
                <SelectItem value="volvo">Volvo</SelectItem>
                <SelectItem value="scania">Scania</SelectItem>
                <SelectItem value="mercedes">Mercedes</SelectItem>
                <SelectItem value="man">MAN</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle List */}
      <div className="grid gap-4">
        {vehicles?.map((vehicle: Vehicle) => (
          <Card key={vehicle.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    {getStatusIcon(vehicle.status)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{vehicle.registration_number}</h3>
                    <p className="text-muted-foreground">
                      {vehicle.make} {vehicle.model} {vehicle.year && `(${vehicle.year})`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className={getStatusColor(vehicle.status)}>{vehicle.status.replace("_", " ")}</Badge>
                  <div className="text-right">
                    <p className="text-sm font-medium">{vehicle.capacity_tons}T Capacity</p>
                    <p className="text-xs text-muted-foreground">{vehicle.odometer_reading?.toLocaleString()} km</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Insurance Expiry</p>
                  <p className="text-sm font-medium">
                    {vehicle.insurance_expiry ? new Date(vehicle.insurance_expiry).toLocaleDateString() : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">License Expiry</p>
                  <p className="text-sm font-medium">
                    {vehicle.license_expiry ? new Date(vehicle.license_expiry).toLocaleDateString() : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Next Service</p>
                  <p className="text-sm font-medium">
                    {vehicle.next_service_due
                      ? new Date(vehicle.next_service_due).toLocaleDateString()
                      : "Not scheduled"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Link href={`/fleet/${vehicle.id}`}>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </Link>
                <Link href={`/fleet/${vehicle.id}/edit`}>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </Link>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-1" />
                  Schedule Service
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!vehicles || vehicles.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Truck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No vehicles found</h3>
              <p className="text-muted-foreground mb-4">Get started by adding your first vehicle to the fleet.</p>
              <Link href="/fleet/add">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vehicle
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
