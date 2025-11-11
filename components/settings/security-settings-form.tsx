"use client"

import { useEffect, useState, useTransition } from "react"

import { updateSecuritySettings } from "@/app/settings/actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export type SecuritySettingsFormValues = {
  requireMfa: boolean
  passwordRotationDays: number
  idleTimeoutMinutes: number
}

interface SecuritySettingsFormProps {
  initialValues: SecuritySettingsFormValues
  canEdit: boolean
}

const PASSWORD_ROTATION_HELP = "Set to 0 to disable forced password rotation."
const IDLE_TIMEOUT_HELP = "Session timeout in minutes. 0 keeps the default platform timeout."

export function SecuritySettingsForm({ initialValues, canEdit }: SecuritySettingsFormProps) {
  const [formValues, setFormValues] = useState<SecuritySettingsFormValues>(initialValues)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setFormValues(initialValues)
  }, [initialValues])

  const handleToggle = (checked: boolean) => {
    setFormValues((prev) => ({ ...prev, requireMfa: checked }))
  }

  const handleNumberChange = (field: "passwordRotationDays" | "idleTimeoutMinutes") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number.parseInt(event.target.value, 10)
      if (Number.isNaN(value)) {
        setFormValues((prev) => ({ ...prev, [field]: 0 }))
      } else {
        setFormValues((prev) => ({ ...prev, [field]: value }))
      }
    }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canEdit) {
      return
    }

    setError(null)
    setSuccess(false)

    startTransition(async () => {
      const result = await updateSecuritySettings({
        requireMfa: formValues.requireMfa,
        passwordRotationDays: formValues.passwordRotationDays,
        idleTimeoutMinutes: formValues.idleTimeoutMinutes,
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
            You need a company administrator or manager role to update security settings.
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
          <AlertDescription>Security settings updated successfully.</AlertDescription>
        </Alert>
      )}

      <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
        <div>
          <Label htmlFor="require-mfa" className="text-base font-medium">
            Require multi-factor authentication
          </Label>
          <p className="text-sm text-muted-foreground">
            Enforce MFA for all company administrators and managers on next sign in.
          </p>
        </div>
        <Switch id="require-mfa" checked={formValues.requireMfa} onCheckedChange={handleToggle} disabled={disabled} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password-rotation" className="text-base font-medium">
          Password rotation (days)
        </Label>
        <Input
          id="password-rotation"
          type="number"
          min={0}
          max={365}
          value={formValues.passwordRotationDays}
          onChange={handleNumberChange("passwordRotationDays")}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">{PASSWORD_ROTATION_HELP}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="idle-timeout" className="text-base font-medium">
          Idle session timeout (minutes)
        </Label>
        <Input
          id="idle-timeout"
          type="number"
          min={0}
          max={1440}
          value={formValues.idleTimeoutMinutes}
          onChange={handleNumberChange("idleTimeoutMinutes")}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">{IDLE_TIMEOUT_HELP}</p>
      </div>

      <Button type="submit" disabled={disabled}>
        {isPending ? "Saving..." : "Save Security Settings"}
      </Button>
    </form>
  )
}
