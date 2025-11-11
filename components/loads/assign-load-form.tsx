"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/lib/hooks/use-user"
import type { Driver, LoadStatus, Vehicle } from "@/lib/types/database"

interface AssignLoadFormProps {
  loadId: string
  onSuccess?: () => void
  onCancel?: () => void
}

interface VehicleOption {
  id: string
  label: string
  status: Vehicle["status"]
  assignedDriverId?: string | null
  assignedDriverName?: string | null
}

interface DriverOption {
  id: string
  label: string
  note?: string
}

export function AssignLoadForm({ loadId, onSuccess, onCancel }: AssignLoadFormProps) {
  const { user, loading: userLoading } = useUser()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [vehicleOptions, setVehicleOptions] = useState<VehicleOption[]>([])
  const [driverOptions, setDriverOptions] = useState<DriverOption[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("")
  const [selectedDriverId, setSelectedDriverId] = useState<string>("")
  const [assignmentNote, setAssignmentNote] = useState<string>("")
  const [currentStatus, setCurrentStatus] = useState<LoadStatus>("pending")
  const [initialVehicleId, setInitialVehicleId] = useState<string | null>(null)
  const [initialDriverId, setInitialDriverId] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [vehicleAssignments, setVehicleAssignments] = useState<Record<string, { driverId: string; driverName: string }>>({})
  const [driverAssignments, setDriverAssignments] = useState<Record<string, { vehicleId: string; vehicleLabel: string }>>({})
  const [vehicleInfoMessage, setVehicleInfoMessage] = useState<string | null>(null)
  const [driverInfoMessage, setDriverInfoMessage] = useState<string | null>(null)
  const autoSyncDriverRef = useRef(true)

  const loadResources = useCallback(async () => {
    if (!user?.company_id) return

    setIsLoading(true)
    try {
      const [vehiclesResult, driversResult, loadResult] = await Promise.all([
        supabase
          .from("vehicles")
          .select(
            `id,
            registration_number,
            make,
            model,
            status,
            assignments:vehicle_driver_assignments(
              driver_id,
              released_at,
              driver:drivers(first_name, last_name)
            )`
          )
          .eq("company_id", user.company_id)
          .eq("status", "active")
          .order("registration_number", { ascending: true }),
        supabase
          .from("drivers")
          .select("id, first_name, last_name, is_active")
          .eq("company_id", user.company_id)
          .eq("is_active", true)
          .order("first_name", { ascending: true }),
        supabase
          .from("loads")
          .select("assigned_vehicle_id, assigned_driver_id, status, special_instructions")
          .eq("id", loadId)
          .eq("company_id", user.company_id)
          .single(),
      ])

      if (vehiclesResult.error) {
        throw vehiclesResult.error
      }
      if (driversResult.error) {
        throw driversResult.error
      }
      if (loadResult.error) {
        throw loadResult.error
      }

      type VehicleRow = Vehicle & {
        assignments?: {
          driver_id: string | null
          released_at: string | null
          driver?: { first_name: string | null; last_name: string | null } | null
        }[]
      }

      const vehicleLabelMap: Record<string, string> = {}
      const vehicleAssignMap: Record<string, { driverId: string; driverName: string }> = {}
      const driverAssignMap: Record<string, { vehicleId: string; vehicleLabel: string }> = {}

      const vehicleOpts = (vehiclesResult.data ?? []).map((vehicle: VehicleRow) => {
        const labelParts = [vehicle.registration_number, vehicle.make, vehicle.model].filter(Boolean)
        const label = labelParts.join(" · ") || "Unlabeled vehicle"
        vehicleLabelMap[vehicle.id] = label

        const activeAssignment =
          vehicle.assignments?.find((assignment) => assignment.released_at === null && assignment.driver_id) ?? null

        let assignedDriverId: string | null = null
        let assignedDriverName: string | null = null

        if (activeAssignment?.driver_id) {
          assignedDriverId = activeAssignment.driver_id
          assignedDriverName = `${activeAssignment.driver?.first_name ?? ""} ${activeAssignment.driver?.last_name ?? ""}`.trim()
          vehicleAssignMap[vehicle.id] = { driverId: assignedDriverId, driverName: assignedDriverName }
          driverAssignMap[assignedDriverId] = { vehicleId: vehicle.id, vehicleLabel: label }
        }

        return {
          id: vehicle.id,
          status: vehicle.status,
          label,
          assignedDriverId,
          assignedDriverName,
        }
      }) as VehicleOption[]
      setVehicleOptions(vehicleOpts)

      const driverOpts = (driversResult.data ?? []).map((driver: Driver) => {
        const name = `${driver.first_name} ${driver.last_name}`.trim()
        const assignment = driverAssignMap[driver.id]

        return {
          id: driver.id,
          label: name,
          note: assignment ? `Assigned to ${assignment.vehicleLabel}` : undefined,
        }
      })
      setDriverOptions(driverOpts)

      setVehicleAssignments(vehicleAssignMap)
      setDriverAssignments(driverAssignMap)

      setSelectedVehicleId(loadResult.data?.assigned_vehicle_id ?? "")
      setSelectedDriverId(loadResult.data?.assigned_driver_id ?? "")
      setInitialVehicleId(loadResult.data?.assigned_vehicle_id ?? null)
      setInitialDriverId(loadResult.data?.assigned_driver_id ?? null)
      setCurrentStatus((loadResult.data?.status as LoadStatus) ?? "pending")
      autoSyncDriverRef.current = false
    } catch (error) {
      console.error("Failed to load assignment resources", error)
      toast.error("Unable to load assignment data")
    } finally {
      setIsLoading(false)
    }
  }, [loadId, supabase, user?.company_id])

  useEffect(() => {
    void loadResources()
  }, [loadResources])

  useEffect(() => {
    if (!selectedVehicleId) {
      setVehicleInfoMessage(null)
      return
    }

    const assignment = vehicleAssignments[selectedVehicleId]
    if (assignment) {
      setVehicleInfoMessage(`Vehicle currently paired with ${assignment.driverName}.`)
      if (autoSyncDriverRef.current) {
        setSelectedDriverId(assignment.driverId)
        autoSyncDriverRef.current = false
      }
    } else {
      setVehicleInfoMessage(null)
      if (autoSyncDriverRef.current) {
        setSelectedDriverId("")
        autoSyncDriverRef.current = false
      }
    }
  }, [selectedVehicleId, vehicleAssignments])

  useEffect(() => {
    if (!selectedDriverId) {
      setDriverInfoMessage(null)
      return
    }

    const assignment = driverAssignments[selectedDriverId]
    if (assignment && assignment.vehicleId !== selectedVehicleId) {
      setDriverInfoMessage(`Driver currently assigned to ${assignment.vehicleLabel}.`)
    } else {
      setDriverInfoMessage(null)
    }
  }, [driverAssignments, selectedDriverId, selectedVehicleId])

  const handleVehicleChange = useCallback((value: string) => {
    autoSyncDriverRef.current = true
    setSelectedVehicleId(value)
  }, [])

  const handleDriverChange = useCallback((value: string) => {
    autoSyncDriverRef.current = false
    setSelectedDriverId(value)
  }, [])

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!user?.company_id || !user.id) {
        toast.error("You do not have permission to assign loads")
        return
      }

      if (!selectedVehicleId || !selectedDriverId) {
        setFormError("Select both a vehicle and driver to continue")
        return
      }

      const vehicleAssignment = selectedVehicleId ? vehicleAssignments[selectedVehicleId] : undefined
      if (vehicleAssignment && vehicleAssignment.driverId && vehicleAssignment.driverId !== selectedDriverId) {
        setFormError(`Vehicle is paired with ${vehicleAssignment.driverName}. Update the vehicle assignment first.`)
        return
      }

      const driverAssignment = selectedDriverId ? driverAssignments[selectedDriverId] : undefined
      if (driverAssignment && driverAssignment.vehicleId && driverAssignment.vehicleId !== selectedVehicleId) {
        setFormError(`Driver is currently assigned to ${driverAssignment.vehicleLabel}. Unassign them first.`)
        return
      }

      setFormError(null)
      setIsSubmitting(true)

      try {
        const nextStatus: LoadStatus = currentStatus === "pending" ? "assigned" : currentStatus
        const assignmentChanged =
          selectedVehicleId !== (initialVehicleId ?? "") || selectedDriverId !== (initialDriverId ?? "")

        const updatePayload: Record<string, unknown> = {
          assigned_vehicle_id: selectedVehicleId,
          assigned_driver_id: selectedDriverId,
          status: nextStatus,
        }

        if (!initialDriverId && !initialVehicleId) {
          updatePayload.dispatcher_id = user.id
        }

        const { error: updateError } = await supabase.from("loads").update(updatePayload).eq("id", loadId)

        if (updateError) {
          throw updateError
        }

        if (assignmentChanged) {
          const vehicleLabel = vehicleOptions.find((vehicle) => vehicle.id === selectedVehicleId)?.label
          const driverLabel = driverOptions.find((driver) => driver.id === selectedDriverId)?.label

          const note =
            assignmentNote.trim() ||
            [`Vehicle ${vehicleLabel ?? ""}`.trim(), `Driver ${driverLabel ?? ""}`.trim()].filter(Boolean).join(" · ")

          await supabase.from("load_tracking").insert({
            load_id: loadId,
            status: nextStatus,
            notes: note || null,
            updated_by: user.id,
          })
        }

        toast.success("Load assignment saved")
        router.refresh()
        onSuccess?.()
      } catch (error) {
        console.error("Failed to assign load", error)
        toast.error("Failed to save assignment")
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      assignmentNote,
      currentStatus,
      driverAssignments,
      driverOptions,
      initialDriverId,
      initialVehicleId,
      loadId,
      onSuccess,
      router,
      selectedDriverId,
      selectedVehicleId,
      supabase,
      user?.company_id,
      user?.id,
      vehicleAssignments,
      vehicleOptions,
    ],
  )

  if (userLoading || isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading available vehicles and drivers…</p>
      </div>
    )
  }

  if (!user || !user.company_id) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          You need company access to manage load assignments. Contact an administrator for assistance.
        </p>
        <Button type="button" variant="outline" onClick={onCancel}>
          Close
        </Button>
      </div>
    )
  }

  const submitDisabled =
    isSubmitting || vehicleOptions.length === 0 || driverOptions.length === 0 || !selectedVehicleId || !selectedDriverId

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="vehicle">Vehicle *</Label>
          <Select value={selectedVehicleId} onValueChange={handleVehicleChange} disabled={vehicleOptions.length === 0}>
            <SelectTrigger id="vehicle">
              <SelectValue placeholder="Select an available vehicle" />
            </SelectTrigger>
            <SelectContent>
              {vehicleOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No active vehicles available</div>
              ) : (
                vehicleOptions.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    <span className="flex flex-col">
                      <span>{vehicle.label}</span>
                      {vehicle.assignedDriverName ? (
                        <span className="text-xs text-muted-foreground">Driver: {vehicle.assignedDriverName}</span>
                      ) : null}
                    </span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {vehicleInfoMessage ? <p className="text-xs text-muted-foreground">{vehicleInfoMessage}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="driver">Driver *</Label>
          <Select value={selectedDriverId} onValueChange={handleDriverChange} disabled={driverOptions.length === 0}>
            <SelectTrigger id="driver">
              <SelectValue placeholder="Select an available driver" />
            </SelectTrigger>
            <SelectContent>
              {driverOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No active drivers available</div>
              ) : (
                driverOptions.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    <span className="flex flex-col">
                      <span>{driver.label}</span>
                      {driver.note ? <span className="text-xs text-muted-foreground">{driver.note}</span> : null}
                    </span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {driverInfoMessage ? <p className="text-xs text-muted-foreground">{driverInfoMessage}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="assignment-note">Assignment note (optional)</Label>
          <Textarea
            id="assignment-note"
            placeholder="Add any special instructions for this assignment"
            value={assignmentNote}
            onChange={(event) => setAssignmentNote(event.target.value)}
            rows={3}
          />
        </div>

        {formError && <p className="text-sm text-destructive">{formError}</p>}
      </div>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitDisabled}>
          {isSubmitting ? "Saving..." : "Assign"}
        </Button>
      </div>
    </form>
  )
}
