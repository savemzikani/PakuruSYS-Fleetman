import { redirect } from "next/navigation"
import { CalendarClock, IdCard, MapPinned, PhoneCall, Plus, Users } from "lucide-react"

import { DriverAddButton, DriverAssignVehicleButton, DriverEditButton } from "@/components/drivers/driver-modal-buttons"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/server"
import type { Driver } from "@/lib/types/database"

function formatName(first: string, last: string) {
  return `${first} ${last}`.trim()
}

export const dynamic = "force-dynamic"

export default async function DriversPage() {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, company_id, role")
    .eq("id", authUser.id)
    .single()

  if (!profile?.company_id) {
    redirect("/auth/login")
  }

  if (!["super_admin", "company_admin", "manager", "dispatcher"].includes(profile.role)) {
    redirect("/dashboard")
  }

  const { data: drivers, error: driversError } = await supabase
    .from("drivers")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("first_name")

  if (driversError) {
    console.error("Failed to fetch drivers", driversError)
  }

  const { data: assignments, error: assignmentsError } = await supabase
    .from("vehicle_driver_assignments")
    .select(
      `id,
      driver_id,
      vehicle_id,
      assigned_at,
      released_at,
      notes,
      vehicle:vehicles(
        id,
        registration_number,
        make,
        model
      )`
    )
    .eq("company_id", profile.company_id)
    .order("assigned_at", { ascending: false })

  if (assignmentsError) {
    console.error("Failed to fetch driver assignments", assignmentsError)
  }

  type AssignmentRow = {
    id: string
    driver_id: string
    vehicle_id: string | null
    assigned_at: string | null
    released_at: string | null
    notes: string | null
    vehicle: { id: string; registration_number: string | null; make: string | null; model: string | null } | null
  }

  type DriverWithAssignments = Driver & {
    assignments: AssignmentRow[]
  }

  const assignmentsByDriver = new Map<string, AssignmentRow[]>()

  for (const assignment of (assignments ?? []) as AssignmentRow[]) {
    const list = assignmentsByDriver.get(assignment.driver_id) ?? []
    list.push(assignment)
    assignmentsByDriver.set(assignment.driver_id, list)
  }

  const driverList: DriverWithAssignments[] = (drivers ?? []).map((driver: Driver) => ({
    ...driver,
    assignments: assignmentsByDriver.get(driver.id) ?? [],
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Drivers Management</h1>
          <p className="text-muted-foreground">Manage your driver roster, credentials, and vehicle assignments.</p>
        </div>
        <DriverAddButton className="w-full md:w-auto">
          <Plus className="h-4 w-4" />
          <span>Add Driver</span>
        </DriverAddButton>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5" />
              Active Drivers
            </CardTitle>
            <CardDescription>Overview of currently active drivers and their vehicle assignments.</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {driverList.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-sm text-muted-foreground">
              <p>No drivers found yet.</p>
              <DriverAddButton variant="outline">
                <Plus className="h-4 w-4" />
                <span>Add your first driver</span>
              </DriverAddButton>
            </div>
          ) : (
            <div className="space-y-4">
              {driverList.map((driver) => {
                const latestAssignment = driver.assignments?.find((assignment) => assignment.released_at === null)
                const vehicleLabel = latestAssignment?.vehicle
                  ? [latestAssignment.vehicle.registration_number, latestAssignment.vehicle.make, latestAssignment.vehicle.model]
                      .filter(Boolean)
                      .join(" · ")
                  : null

                return (
                  <div
                    key={driver.id}
                    className="rounded-lg border bg-card p-4 shadow-xs transition hover:shadow-sm"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold">{formatName(driver.first_name, driver.last_name)}</h2>
                          <Badge variant={driver.is_active ? "outline" : "destructive"}>
                            {driver.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>

                        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <IdCard className="h-4 w-4" />
                            <span>{driver.license_number}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CalendarClock className="h-4 w-4" />
                            <span>Expires {new Date(driver.license_expiry).toLocaleDateString()}</span>
                          </div>
                          {driver.phone ? (
                            <div className="flex items-center gap-2">
                              <PhoneCall className="h-4 w-4" />
                              <span>{driver.phone}</span>
                            </div>
                          ) : null}
                          {vehicleLabel ? (
                            <div className="flex items-center gap-2">
                              <MapPinned className="h-4 w-4" />
                              <span>{vehicleLabel}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <MapPinned className="h-4 w-4" />
                              <span className="italic text-muted-foreground">No vehicle assigned</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                        <DriverAssignVehicleButton driverId={driver.id} className="w-full sm:w-auto" variant="secondary">
                          Manage Vehicle
                        </DriverAssignVehicleButton>
                        <DriverEditButton driverId={driver.id} variant="outline" className="w-full sm:w-auto">
                          Edit Details
                        </DriverEditButton>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                      {driver.email ? <p>Email: {driver.email}</p> : null}
                      {driver.address ? <p>Address: {driver.address}</p> : null}
                      {driver.emergency_contact_name ? (
                        <p>
                          Emergency Contact: {driver.emergency_contact_name}
                          {driver.emergency_contact_phone ? ` · ${driver.emergency_contact_phone}` : ""}
                        </p>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
