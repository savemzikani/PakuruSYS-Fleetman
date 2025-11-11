"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useUser } from "@/lib/hooks/use-user"
import { createClient } from "@/lib/supabase/client"
import type { Vehicle } from "@/lib/types/database"

const UNASSIGNED_VALUE = "__unassigned__"

interface DriverAssignVehicleFormProps {
  driverId: string
  onSuccess?: () => void
  onCancel?: () => void
}

interface VehicleOption {
  id: string
  label: string
  disabled: boolean
  assignedDriverName?: string | null
  assignedDriverId?: string | null
}

interface AssignmentRecord {
  id: string
  vehicle_id: string | null
  assigned_at: string
  released_at: string | null
  notes: string | null
  vehicle?: {
    registration_number: string | null
    make: string | null
    model: string | null
  } | null
}

export function DriverAssignVehicleForm({ driverId, onSuccess, onCancel }: DriverAssignVehicleFormProps) {
  const { user, loading: userLoading } = useUser()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [driverName, setDriverName] = useState<string>("")
  const [vehicleOptions, setVehicleOptions] = useState<VehicleOption[]>([])
  const [assignmentHistory, setAssignmentHistory] = useState<AssignmentRecord[]>([])
  const [currentAssignment, setCurrentAssignment] = useState<AssignmentRecord | null>(null)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(UNASSIGNED_VALUE)
  const [note, setNote] = useState<string>("")

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const loadResources = useCallback(async () => {
    if (!user?.company_id) return

    setIsLoading(true)
    try {
      const { data: driver, error: driverError } = await supabase
        .from("drivers")
        .select("first_name, last_name, company_id")
        .eq("id", driverId)
        .maybeSingle()

      if (driverError) throw driverError
      if (!driver) {
        toast.error("Driver not found")
        onCancel?.()
        return
      }

      const companyId = driver.company_id
      setDriverName(`${driver.first_name ?? ""} ${driver.last_name ?? ""}`.trim())

      const [vehiclesResult, historyResult] = await Promise.all([
        supabase
          .from("vehicles")
          .select(
            `id,
            registration_number,
            make,
            model,
            status,
            assignments:vehicle_driver_assignments(
              id,
              driver_id,
              released_at,
              driver:drivers(first_name, last_name)
            )`
          )
          .eq("company_id", companyId)
          .order("registration_number"),
        supabase
          .from("vehicle_driver_assignments")
          .select(
            `id,
            vehicle_id,
            assigned_at,
            released_at,
            notes,
            vehicle:vehicles(registration_number, make, model)`
          )
          .eq("driver_id", driverId)
          .eq("company_id", companyId)
          .order("assigned_at", { ascending: false })
          .limit(10),
      ])

      if (vehiclesResult.error) throw vehiclesResult.error
      if (historyResult.error) throw historyResult.error

      const history = (historyResult.data ?? []) as AssignmentRecord[]
      setAssignmentHistory(history)

      const activeAssignment = history.find((record) => record.released_at === null) ?? null
      setCurrentAssignment(activeAssignment ?? null)
      setNote(activeAssignment?.notes ?? "")

      type VehicleWithAssignments = Vehicle & {
        assignments?: {
          id: string
          driver_id: string | null
          released_at: string | null
          driver?: { first_name: string | null; last_name: string | null } | null
        }[]
      }

      const vehicleOpts = (vehiclesResult.data ?? []).map((vehicle: VehicleWithAssignments) => {
        const activeVehicleAssignment = vehicle.assignments?.find(
          (assignment) => assignment.released_at === null,
        ) ?? null

        const assignedDriverName = activeVehicleAssignment?.driver
          ? `${activeVehicleAssignment.driver.first_name ?? ""} ${activeVehicleAssignment.driver.last_name ?? ""}`.trim()
          : null

        const labelParts = [vehicle.registration_number, vehicle.make, vehicle.model].filter(Boolean)
        const label = labelParts.join(" · ") || "Untitled vehicle"

        const disabled =
          (vehicle.status && vehicle.status !== "active") ||
          (!!activeVehicleAssignment && activeVehicleAssignment.driver_id !== driverId)

        return {
          id: vehicle.id,
          label,
          disabled,
          assignedDriverName,
          assignedDriverId: activeVehicleAssignment?.driver_id ?? null,
        }
      }) as VehicleOption[]

      setVehicleOptions(vehicleOpts)

      if (activeAssignment?.vehicle_id) {
        setSelectedVehicleId(activeAssignment.vehicle_id)
      } else {
        setSelectedVehicleId(UNASSIGNED_VALUE)
      }
    } catch (error) {
      console.error("Failed to load assignment resources", error)
      toast.error("Unable to load vehicles for assignment")
      onCancel?.()
    } finally {
      setIsLoading(false)
    }
  }, [driverId, onCancel, supabase, user?.company_id])

  useEffect(() => {
    void loadResources()
  }, [loadResources])

  const handleVehicleChange = useCallback(
    (value: string) => {
      setSelectedVehicleId(value)
      setFormError(null)
    },
    [],
  )

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!user?.company_id || !user.id) {
        toast.error("Company context missing")
        return
      }

      setFormError(null)

      const trimmedNote = note.trim()
      const noteValue = trimmedNote ? trimmedNote : null
      const nowIso = new Date().toISOString()

      if (selectedVehicleId === UNASSIGNED_VALUE) {
        if (!currentAssignment) {
          setFormError("This driver is already unassigned")
          return
        }

        setIsSubmitting(true)
        try {
          const { error: releaseError } = await supabase
            .from("vehicle_driver_assignments")
            .update({ released_at: nowIso, notes: noteValue ?? currentAssignment.notes })
            .eq("id", currentAssignment.id)
            .is("released_at", null)

          if (releaseError) throw releaseError

          toast.success("Driver unassigned from vehicle")
          router.refresh()
          onSuccess?.()
        } catch (error) {
          console.error("Failed to unassign driver", error)
          toast.error("Failed to unassign driver")
        } finally {
          setIsSubmitting(false)
        }

        return
      }

      if (currentAssignment && currentAssignment.vehicle_id === selectedVehicleId) {
        if (!noteValue || noteValue === currentAssignment.notes) {
          setFormError("No changes to save")
          return
        }

        setIsSubmitting(true)
        try {
          const { error: updateError } = await supabase
            .from("vehicle_driver_assignments")
            .update({ notes: noteValue })
            .eq("id", currentAssignment.id)
            .is("released_at", null)

          if (updateError) throw updateError

          toast.success("Assignment note updated")
          router.refresh()
          onSuccess?.()
        } catch (error) {
          console.error("Failed to update assignment note", error)
          toast.error("Failed to update assignment")
        } finally {
          setIsSubmitting(false)
        }

        return
      }

      setIsSubmitting(true)
      try {
        if (currentAssignment) {
          const { error: releaseCurrentError } = await supabase
            .from("vehicle_driver_assignments")
            .update({ released_at: nowIso })
            .eq("id", currentAssignment.id)
            .is("released_at", null)

          if (releaseCurrentError) throw releaseCurrentError
        }

        const { error: releaseVehicleError } = await supabase
          .from("vehicle_driver_assignments")
          .update({ released_at: nowIso })
          .eq("vehicle_id", selectedVehicleId)
          .is("released_at", null)

        if (releaseVehicleError) throw releaseVehicleError

        const { error: insertError } = await supabase.from("vehicle_driver_assignments").insert({
          company_id: user.company_id,
          driver_id: driverId,
          vehicle_id: selectedVehicleId,
          assigned_by: user.id,
          notes: noteValue,
        })

        if (insertError) throw insertError

        toast.success("Vehicle assignment saved")
        router.refresh()
        onSuccess?.()
      } catch (error) {
        console.error("Failed to assign vehicle", error)
        toast.error("Failed to save vehicle assignment")
      } finally {
        setIsSubmitting(false)
      }
    },
    [currentAssignment, driverId, note, onSuccess, router, selectedVehicleId, supabase, user?.company_id, user?.id],
  )

  if (userLoading || isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading vehicles…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Driver</Label>
        <p className="text-sm text-muted-foreground">{driverName || "Unnamed driver"}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="driver-vehicle-select">Vehicle</Label>
        <Select value={selectedVehicleId} onValueChange={handleVehicleChange}>
          <SelectTrigger id="driver-vehicle-select">
            <SelectValue placeholder="Select a vehicle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED_VALUE}>No vehicle (unassign driver)</SelectItem>
            {vehicleOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">No vehicles available</div>
            ) : (
              vehicleOptions.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id} disabled={vehicle.disabled}>
                  <span className="flex flex-col gap-1">
                    <span>{vehicle.label}</span>
                    {vehicle.assignedDriverName && vehicle.assignedDriverId !== driverId ? (
                      <span className="text-xs text-muted-foreground">
                        Assigned to {vehicle.assignedDriverName}
                      </span>
                    ) : null}
                  </span>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="driver-vehicle-note">Notes (optional)</Label>
        <Textarea
          id="driver-vehicle-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add context for this assignment"
          rows={3}
        />
      </div>

      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

      {assignmentHistory.length > 0 ? (
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Recent assignments</Label>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {assignmentHistory.map((record) => {
              const vehicleLabel = [
                record.vehicle?.registration_number,
                record.vehicle?.make,
                record.vehicle?.model,
              ]
                .filter(Boolean)
                .join(" · ")

              const assignedDate = new Date(record.assigned_at).toLocaleString()
              const releasedDate = record.released_at ? new Date(record.released_at).toLocaleString() : null

              return (
                <li key={record.id} className="rounded-md border bg-muted/40 px-3 py-2">
                  <p className="font-medium text-foreground">{vehicleLabel || "Unassigned"}</p>
                  <p>
                    Assigned: {assignedDate}
                    {releasedDate ? ` · Released: ${releasedDate}` : ""}
                  </p>
                  {record.notes ? <p className="italic">Note: {record.notes}</p> : null}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      <div className="flex justify-end gap-3">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Assignment"}
        </Button>
      </div>
    </form>
  )
}
