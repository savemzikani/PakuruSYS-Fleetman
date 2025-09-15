import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Plus, Search, Phone, Mail, MapPin, AlertTriangle, Calendar } from "lucide-react"
import Link from "next/link"
import type { Driver } from "@/lib/types/database"

export default async function DriversPage() {
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

  // Fetch drivers
  const { data: drivers } = await supabase
    .from("drivers")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false })

  // Calculate driver statistics
  const totalDrivers = drivers?.length || 0
  const activeDrivers = drivers?.filter((d) => d.is_active).length || 0
  const inactiveDrivers = drivers?.filter((d) => !d.is_active).length || 0
  const expiringLicenses = drivers?.filter((d) => {
    if (!d.license_expiry) return false
    const expiryDate = new Date(d.license_expiry)
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    return expiryDate <= thirtyDaysFromNow
  }).length || 0

  const isLicenseExpiring = (date: string) => {
    const expiryDate = new Date(date)
    const today = new Date()
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    return expiryDate <= thirtyDaysFromNow
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Driver Management</h1>
          <p className="text-muted-foreground">Manage your drivers, licenses, and assignments</p>
        </div>
        <Link href="/drivers/add">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Driver
          </Button>
        </Link>
      </div>

      {/* Driver Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDrivers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeDrivers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <div className="h-2 w-2 bg-red-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{inactiveDrivers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">License Expiring</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{expiringLicenses}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Drivers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search by name, license number, or phone..." className="pl-10" />
              </div>
            </div>
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by license" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Licenses</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Driver List */}
      <div className="grid gap-4">
        {drivers?.map((driver: Driver) => (
          <Card key={driver.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{driver.first_name} {driver.last_name}</h3>
                    <p className="text-muted-foreground">License: {driver.license_number}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
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

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">{driver.phone || "Not provided"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{driver.email || "Not provided"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">License Expiry</p>
                    <p className="text-sm font-medium">
                      {driver.license_expiry ? new Date(driver.license_expiry).toLocaleDateString() : "Not set"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="text-sm font-medium">{driver.address || "Not provided"}</p>
                  </div>
                </div>
              </div>

              {(driver.emergency_contact_name || driver.emergency_contact_phone) && (
                <div className="grid gap-4 md:grid-cols-2 mb-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Emergency Contact:</span>{" "}
                    <span className="font-medium">{driver.emergency_contact_name || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Emergency Phone:</span>{" "}
                    <span className="font-medium">{driver.emergency_contact_phone || "N/A"}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Link href={`/drivers/${driver.id}`}>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </Link>
                <Link href={`/drivers/${driver.id}/edit`}>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </Link>
                <Link href={`/loads?driver=${driver.id}`}>
                  <Button variant="outline" size="sm">
                    View Loads
                  </Button>
                </Link>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-1" />
                  Assign Vehicle
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!drivers || drivers.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No drivers found</h3>
              <p className="text-muted-foreground mb-4">Get started by adding your first driver.</p>
              <Link href="/drivers/add">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Driver
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}