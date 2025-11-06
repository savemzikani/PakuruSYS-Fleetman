"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
}

interface DriverOption {
  id: string
  label: string
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

  const loadResources = useCallback(async () => {
    if (!user?.company_id) return

    setIsLoading(true)
    try {
      const [vehiclesResult, driversResult, loadResult] = await Promise.all([
        supabase
          .from("vehicles")
          .select("id, registration_number, make, model, status")
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

      const vehicleOpts = (vehiclesResult.data ?? []).map((vehicle: Vehicle) => ({
        id: vehicle.id,
        status: vehicle.status,
        label: [vehicle.registration_number, vehicle.make, vehicle.model]
          .filter(Boolean)
          .join(" · "),
      }))
      setVehicleOptions(vehicleOpts)

      const driverOpts = (driversResult.data ?? []).map((driver: Driver) => ({
        id: driver.id,
        label: `${driver.first_name} ${driver.last_name}`.trim(),
      }))
      setDriverOptions(driverOpts)

      setSelectedVehicleId(loadResult.data?.assigned_vehicle_id ?? "")
      setSelectedDriverId(loadResult.data?.assigned_driver_id ?? "")
      setInitialVehicleId(loadResult.data?.assigned_vehicle_id ?? null)
      setInitialDriverId(loadResult.data?.assigned_driver_id ?? null)
      setCurrentStatus((loadResult.data?.status as LoadStatus) ?? "pending")
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
          <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId} disabled={vehicleOptions.length === 0}>
            <SelectTrigger id="vehicle">
              <SelectValue placeholder="Select an available vehicle" />
            </SelectTrigger>
            <SelectContent>
              {vehicleOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No active vehicles available</div>
              ) : (
                vehicleOptions.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="driver">Driver *</Label>
          <Select value={selectedDriverId} onValueChange={setSelectedDriverId} disabled={driverOptions.length === 0}>
            <SelectTrigger id="driver">
              <SelectValue placeholder="Select an available driver" />
            </SelectTrigger>
            <SelectContent>
              {driverOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No active drivers available</div>
              ) : (
                driverOptions.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
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
