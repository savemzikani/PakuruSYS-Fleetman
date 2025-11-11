"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useUser } from "@/lib/hooks/use-user"
import { createClient } from "@/lib/supabase/client"
import { createDriver, updateDriver } from "@/app/drivers/actions"

type DriverFormMode = "create" | "edit"

interface DriverFormProps {
  mode: DriverFormMode
  driverId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

interface FormState {
  first_name: string
  last_name: string
  email: string
  phone: string
  license_number: string
  license_expiry: string
  address: string
  emergency_contact_name: string
  emergency_contact_phone: string
  is_active: boolean
}

const EMPTY_STATE: FormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  license_number: "",
  license_expiry: "",
  address: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  is_active: true,
}

export function DriverForm({ mode, driverId, onSuccess, onCancel }: DriverFormProps) {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const supabase = useMemo(() => createClient(), [])

  const [formData, setFormData] = useState<FormState>(EMPTY_STATE)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isPrefilling, setIsPrefilling] = useState(mode === "edit")

  const handleFieldChange = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  useEffect(() => {
    if (mode !== "edit" || !driverId) return

    const loadDriver = async () => {
      try {
        const { data, error } = await supabase
          .from("drivers")
          .select("*")
          .eq("id", driverId)
          .maybeSingle()

        if (error) throw error

        if (!data) {
          toast.error("Driver not found")
          onCancel?.()
          return
        }

        setFormData({
          first_name: data.first_name ?? "",
          last_name: data.last_name ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          license_number: data.license_number ?? "",
          license_expiry: data.license_expiry ? data.license_expiry.slice(0, 10) : "",
          address: data.address ?? "",
          emergency_contact_name: data.emergency_contact_name ?? "",
          emergency_contact_phone: data.emergency_contact_phone ?? "",
          is_active: data.is_active ?? true,
        })
      } catch (error) {
        console.error("Failed to load driver", error)
        toast.error("Unable to load driver details")
        onCancel?.()
      } finally {
        setIsPrefilling(false)
      }
    }

    void loadDriver()
  }, [driverId, mode, onCancel, supabase])

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!user?.company_id) {
        toast.error("Company context missing")
        return
      }

      if (!formData.first_name.trim() || !formData.last_name.trim()) {
        setFormError("First name and last name are required")
        return
      }

      if (!formData.license_number.trim()) {
        setFormError("License number is required")
        return
      }

      if (!formData.license_expiry) {
        setFormError("License expiry date is required")
        return
      }

      setFormError(null)
      setIsSubmitting(true)

      const payload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        license_number: formData.license_number.trim(),
        license_expiry: formData.license_expiry,
        address: formData.address.trim() || null,
        emergency_contact_name: formData.emergency_contact_name.trim() || null,
        emergency_contact_phone: formData.emergency_contact_phone.trim() || null,
        is_active: formData.is_active,
      }

      try {
        if (mode === "create") {
          const result = await createDriver({
            ...payload,
            license_expiry: new Date(payload.license_expiry),
          })

          if (!result.success) {
            throw new Error(result.error ?? "Failed to add driver")
          }

          toast.success("Driver added successfully")
          setFormData(EMPTY_STATE)
          onSuccess?.()
        } else if (mode === "edit" && driverId) {
          const result = await updateDriver(driverId, {
            ...payload,
            license_expiry: new Date(payload.license_expiry),
          })

          if (!result.success) {
            throw new Error(result.error ?? "Failed to update driver")
          }

          toast.success("Driver updated successfully")
          onSuccess?.()
        }

        router.refresh()
      } catch (error) {
        console.error("Failed to save driver", error)
        const message = error instanceof Error ? error.message : "Failed to save driver"
        toast.error(message)
        setFormError(message)
      } finally {
        setIsSubmitting(false)
      }
    },
    [driverId, formData, mode, onSuccess, router, user?.company_id],
  )

  if (userLoading || isPrefilling) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading driver details…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="driver-first-name">First Name *</Label>
          <Input
            id="driver-first-name"
            value={formData.first_name}
            onChange={(event) => handleFieldChange("first_name", event.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="driver-last-name">Last Name *</Label>
          <Input
            id="driver-last-name"
            value={formData.last_name}
            onChange={(event) => handleFieldChange("last_name", event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="driver-email">Email</Label>
          <Input
            id="driver-email"
            type="email"
            value={formData.email}
            onChange={(event) => handleFieldChange("email", event.target.value)}
            placeholder="driver@example.com"
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="driver-phone">Phone</Label>
          <Input
            id="driver-phone"
            value={formData.phone}
            onChange={(event) => handleFieldChange("phone", event.target.value)}
            placeholder="+27 00 000 0000"
            autoComplete="tel"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="driver-license-number">License Number *</Label>
          <Input
            id="driver-license-number"
            value={formData.license_number}
            onChange={(event) => handleFieldChange("license_number", event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="driver-license-expiry">License Expiry *</Label>
          <Input
            id="driver-license-expiry"
            type="date"
            value={formData.license_expiry}
            onChange={(event) => handleFieldChange("license_expiry", event.target.value)}
            required
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="driver-address">Address</Label>
          <Textarea
            id="driver-address"
            value={formData.address}
            onChange={(event) => handleFieldChange("address", event.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="driver-emergency-name">Emergency Contact Name</Label>
          <Input
            id="driver-emergency-name"
            value={formData.emergency_contact_name}
            onChange={(event) => handleFieldChange("emergency_contact_name", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="driver-emergency-phone">Emergency Contact Phone</Label>
          <Input
            id="driver-emergency-phone"
            value={formData.emergency_contact_phone}
            onChange={(event) => handleFieldChange("emergency_contact_phone", event.target.value)}
          />
        </div>

        <div className="md:col-span-2 flex items-center justify-between rounded-md border bg-muted/40 px-4 py-3">
          <div>
            <Label htmlFor="driver-active" className="text-base font-medium">
              Active Driver
            </Label>
            <p className="text-sm text-muted-foreground">Toggle to deactivate drivers who are unavailable.</p>
          </div>
          <Switch
            id="driver-active"
            checked={formData.is_active}
            onCheckedChange={(checked) => handleFieldChange("is_active", checked)}
          />
        </div>
      </div>

      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

      <div className="flex justify-end gap-3">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : mode === "create" ? "Add Driver" : "Save Changes"}
        </Button>
      </div>
    </form>
  )
}
