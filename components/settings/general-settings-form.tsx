"use client"

import { useEffect, useState, useTransition } from "react"

import { updateCompanyProfile } from "@/app/settings/actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type GeneralSettingsFormValues = {
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  postalCode?: string | null
}

interface GeneralSettingsFormProps {
  initialValues: GeneralSettingsFormValues
  canEdit: boolean
}

export function GeneralSettingsForm({ initialValues, canEdit }: GeneralSettingsFormProps) {
  const [formValues, setFormValues] = useState<GeneralSettingsFormValues>(initialValues)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setFormValues(initialValues)
  }, [initialValues])

  const handleChange = (field: keyof GeneralSettingsFormValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormValues((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canEdit) {
      return
    }

    setError(null)
    setSuccess(false)

    startTransition(async () => {
      const result = await updateCompanyProfile(formValues)
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
            You need a company administrator or manager role to update company details.
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
          <AlertDescription>Company profile updated successfully.</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="company-name">Company Name *</Label>
          <Input
            id="company-name"
            required
            value={formValues.name}
            onChange={handleChange("name")}
            placeholder="Your Company"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company-email">Company Email</Label>
          <Input
            id="company-email"
            type="email"
            value={formValues.email ?? ""}
            onChange={handleChange("email")}
            placeholder="operations@example.com"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company-phone">Phone Number</Label>
          <Input
            id="company-phone"
            value={formValues.phone ?? ""}
            onChange={handleChange("phone")}
            placeholder="+27 11 555 1234"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="company-address">Address</Label>
          <Input
            id="company-address"
            value={formValues.address ?? ""}
            onChange={handleChange("address")}
            placeholder="123 Logistics Park"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company-city">City</Label>
          <Input
            id="company-city"
            value={formValues.city ?? ""}
            onChange={handleChange("city")}
            placeholder="Johannesburg"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company-country">Country</Label>
          <Input
            id="company-country"
            value={formValues.country ?? ""}
            onChange={handleChange("country")}
            placeholder="South Africa"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company-postal">Postal Code</Label>
          <Input
            id="company-postal"
            value={formValues.postalCode ?? ""}
            onChange={handleChange("postalCode")}
            placeholder="2000"
            disabled={disabled}
          />
        </div>
      </div>

      <Button type="submit" disabled={disabled}>
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  )
}
