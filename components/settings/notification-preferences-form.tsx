"use client"

import { useEffect, useState, useTransition } from "react"

import { updateNotificationPreferences } from "@/app/settings/actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export type NotificationPreferencesFormValues = {
  loadUpdates: boolean
  invoiceEvents: boolean
  maintenanceAlerts: boolean
  escalationEmail: string | null
}

interface NotificationPreferencesFormProps {
  initialValues: NotificationPreferencesFormValues
  canEdit: boolean
}

export function NotificationPreferencesForm({ initialValues, canEdit }: NotificationPreferencesFormProps) {
  const [formValues, setFormValues] = useState<NotificationPreferencesFormValues>(initialValues)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setFormValues(initialValues)
  }, [initialValues])

  const handleToggle = (field: keyof NotificationPreferencesFormValues) => (checked: boolean) => {
    setFormValues((prev) => ({ ...prev, [field]: checked }))
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    setFormValues((prev) => ({ ...prev, escalationEmail: value }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canEdit) {
      return
    }

    setError(null)
    setSuccess(false)

    startTransition(async () => {
      const result = await updateNotificationPreferences({
        loadUpdates: formValues.loadUpdates,
        invoiceEvents: formValues.invoiceEvents,
        maintenanceAlerts: formValues.maintenanceAlerts,
        escalationEmail: formValues.escalationEmail?.trim() ? formValues.escalationEmail.trim() : null,
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      setSuccess(true)
    })
  }

  const disabled = isPending || !canEdit

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {!canEdit && (
        <Alert variant="default">
          <AlertDescription>
            You need a company administrator or manager role to change notification preferences.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && !error && (
        <Alert variant="default">
          <AlertDescription>Notification preferences updated successfully.</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
          <div>
            <Label htmlFor="load-updates" className="text-base font-medium">
              Load status updates
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive alerts when loads change status (pending, in transit, delivered).
            </p>
          </div>
          <Switch
            id="load-updates"
            checked={formValues.loadUpdates}
            onCheckedChange={handleToggle("loadUpdates")}
            disabled={disabled}
          />
        </div>

        <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
          <div>
            <Label htmlFor="invoice-events" className="text-base font-medium">
              Invoice events
            </Label>
            <p className="text-sm text-muted-foreground">Get notified when invoices are issued or payments are recorded.</p>
          </div>
          <Switch
            id="invoice-events"
            checked={formValues.invoiceEvents}
            onCheckedChange={handleToggle("invoiceEvents")}
            disabled={disabled}
          />
        </div>

        <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
          <div>
            <Label htmlFor="maintenance-alerts" className="text-base font-medium">
              Maintenance alerts
            </Label>
            <p className="text-sm text-muted-foreground">Track upcoming service or expiring compliance documents.</p>
          </div>
          <Switch
            id="maintenance-alerts"
            checked={formValues.maintenanceAlerts}
            onCheckedChange={handleToggle("maintenanceAlerts")}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="escalation-email">Escalation email</Label>
        <Input
          id="escalation-email"
          type="email"
          value={formValues.escalationEmail ?? ""}
          onChange={handleChange}
          placeholder="ops-lead@example.com"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Optional: Send critical alerts to an additional email address for follow-up.
        </p>
      </div>

      <Button type="submit" disabled={disabled}>
        {isPending ? "Saving..." : "Save Preferences"}
      </Button>
    </form>
  )
}
