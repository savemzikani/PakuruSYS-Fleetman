"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/lib/hooks/use-user"
import { createLoad, updateLoad } from "@/app/loads/actions"
import type { CurrencyCode, Customer, LoadStatus } from "@/lib/types/database"

type LoadFormMode = "create" | "edit"

interface LoadFormProps {
  mode: LoadFormMode
  loadId?: string
  defaultCustomerId?: string | null
  quoteId?: string | null
  onSuccess?: (loadId: string) => void
  onCancel?: () => void
}

type FormState = {
  load_number: string
  customer_id: string
  quote_id: string | null
  description: string
  weight_kg: string
  volume_m3: string
  pickup_address: string
  pickup_city: string
  pickup_country: string
  pickup_date: string
  delivery_address: string
  delivery_city: string
  delivery_country: string
  delivery_date: string
  rate: string
  currency: CurrencyCode
  special_instructions: string
  status: LoadStatus
}

const EMPTY_FORM: FormState = {
  load_number: "",
  customer_id: "",
  quote_id: null,
  description: "",
  weight_kg: "",
  volume_m3: "",
  pickup_address: "",
  pickup_city: "",
  pickup_country: "",
  pickup_date: "",
  delivery_address: "",
  delivery_city: "",
  delivery_country: "",
  delivery_date: "",
  rate: "",
  currency: "USD",
  special_instructions: "",
  status: "pending",
}

const COUNTRY_OPTIONS = [
  "South Africa",
  "Botswana",
  "Namibia",
  "Zimbabwe",
  "Zambia",
  "Mozambique",
  "Malawi",
  "Lesotho",
  "Eswatini",
]

const CURRENCY_OPTIONS: CurrencyCode[] = ["USD", "ZAR", "BWP", "NAD", "ZWL", "ZMW", "MZN"]

const STATUS_OPTIONS: LoadStatus[] = ["pending", "assigned", "in_transit", "delivered", "cancelled"]

export function LoadForm({ mode, loadId, defaultCustomerId, quoteId, onSuccess, onCancel }: LoadFormProps) {
  const { user, loading: userLoading } = useUser()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [formData, setFormData] = useState<FormState>(EMPTY_FORM)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isGeneratingNumber, setIsGeneratingNumber] = useState(false)
  const [isPrefilling, setIsPrefilling] = useState(mode === "edit")

  const pendingCustomerIdRef = useRef<string | null>(null)
  const initialCustomerHandledRef = useRef(false)

  const resetForm = useCallback((next: Partial<FormState> = {}) => {
    setFormData({ ...EMPTY_FORM, ...next })
  }, [])

  useEffect(() => {
    if (!user?.company_id) return

    const loadCustomers = async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("company_id", user.company_id)
        .eq("is_active", true)
        .order("name")

      if (error) {
        console.error("Failed to fetch customers", error)
        toast.error("Unable to load customers")
        return
      }

      setCustomers(data ?? [])
    }

    void loadCustomers()
  }, [supabase, user?.company_id])

  const getCustomerCode = useCallback(
    (customerId: string) => {
      const customer = customers.find((c) => c.id === customerId)
      if (!customer?.name) return "CST"

      const normalized = customer.name.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
      return normalized.length >= 3 ? normalized.slice(0, 3) : normalized.padEnd(3, "X")
    },
    [customers],
  )

  const buildLoadNumber = useCallback((customerCode: string, sequence?: number) => {
    const now = new Date()
    const year = now.getFullYear().toString().slice(-2)
    const month = (now.getMonth() + 1).toString().padStart(2, "0")
    const sequenceValue = sequence ?? Math.floor(Math.random() * 999) + 1

    return `LD-${customerCode}-${year}${month}-${sequenceValue.toString().padStart(3, "0")}`
  }, [])

  const generateLoadNumberForCustomer = useCallback(
    async (customerId: string) => {
      if (mode !== "create" || !user?.company_id || !customerId) return

      pendingCustomerIdRef.current = customerId
      setIsGeneratingNumber(true)

      const customerCode = getCustomerCode(customerId)

      try {
        const { data, error } = await supabase.rpc("next_document_number", {
          doc_type: "load",
          in_company_id: user.company_id,
          in_customer_id: customerId,
        })

        if (error) throw error

        if (pendingCustomerIdRef.current === customerId) {
          setFormData((prev) => ({
            ...prev,
            load_number: data ?? buildLoadNumber(customerCode),
          }))
        }
      } catch (error) {
        console.error("Failed to generate load number", error)
        if (pendingCustomerIdRef.current === customerId) {
          setFormData((prev) => ({
            ...prev,
            load_number: buildLoadNumber(customerCode),
          }))
        }
      } finally {
        if (pendingCustomerIdRef.current === customerId) {
          pendingCustomerIdRef.current = null
          setIsGeneratingNumber(false)
        }
      }
    },
    [buildLoadNumber, getCustomerCode, mode, supabase, user?.company_id],
  )

  useEffect(() => {
    if (mode !== "edit" || !loadId || !user?.company_id) return

    const loadExisting = async () => {
      const { data, error } = await supabase
        .from("loads")
        .select("*")
        .eq("company_id", user.company_id)
        .eq("id", loadId)
        .single()

      if (error) {
        console.error("Failed to fetch load", error)
        toast.error("Unable to load details")
        setIsPrefilling(false)
        return
      }

      resetForm({
        load_number: data.load_number ?? "",
        customer_id: data.customer_id ?? "",
        quote_id: data.quote_id ?? null,
        description: data.description ?? "",
        weight_kg: data.weight_kg ? String(data.weight_kg) : "",
        volume_m3: data.volume_m3 ? String(data.volume_m3) : "",
        pickup_address: data.pickup_address ?? "",
        pickup_city: data.pickup_city ?? "",
        pickup_country: data.pickup_country ?? "",
        pickup_date: data.pickup_date ? data.pickup_date.slice(0, 16) : "",
        delivery_address: data.delivery_address ?? "",
        delivery_city: data.delivery_city ?? "",
        delivery_country: data.delivery_country ?? "",
        delivery_date: data.delivery_date ? data.delivery_date.slice(0, 16) : "",
        rate: data.rate ? String(data.rate) : "",
        currency: (data.currency ?? "USD") as CurrencyCode,
        special_instructions: data.special_instructions ?? "",
        status: data.status ?? "pending",
      })

      setIsPrefilling(false)
    }

    void loadExisting()
  }, [loadId, mode, resetForm, supabase, user?.company_id])

  useEffect(() => {
    if (mode !== "create" || initialCustomerHandledRef.current) return

    if (defaultCustomerId) {
      initialCustomerHandledRef.current = true
      setFormData((prev) => ({ ...prev, customer_id: defaultCustomerId, quote_id: quoteId ?? prev.quote_id }))
      void generateLoadNumberForCustomer(defaultCustomerId)
    } else {
      initialCustomerHandledRef.current = true
      if (quoteId) {
        setFormData((prev) => ({ ...prev, quote_id: quoteId }))
      }
    }
  }, [defaultCustomerId, generateLoadNumberForCustomer, mode, quoteId])

  useEffect(() => {
    if (mode !== "create") return
    if (quoteId) {
      setFormData((prev) => ({ ...prev, quote_id: quoteId }))
    }
  }, [mode, quoteId])

  const handleCustomerChange = useCallback(
    (customerId: string) => {
      setFormData((prev) => ({
        ...prev,
        customer_id: customerId,
        load_number: mode === "create" ? "" : prev.load_number,
        quote_id: mode === "create" ? null : prev.quote_id,
      }))

      if (mode === "create" && customerId) {
        void generateLoadNumberForCustomer(customerId)
      }
    },
    [generateLoadNumberForCustomer, mode],
  )

  const handleFieldChange = useCallback((field: keyof FormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!user?.company_id) {
        toast.error("Missing company information")
        return
      }

      if (!formData.customer_id) {
        setFormError("Please select a customer")
        return
      }

      if (mode === "create" && !formData.load_number) {
        setFormError("Select a customer to generate a load number")
        return
      }

      setFormError(null)
      setIsSubmitting(true)

      const payload = {
        load_number: formData.load_number || null,
        customer_id: formData.customer_id,
        quote_id: formData.quote_id || null,
        description: formData.description || null,
        weight_kg: formData.weight_kg ? Number.parseFloat(formData.weight_kg) : null,
        volume_m3: formData.volume_m3 ? Number.parseFloat(formData.volume_m3) : null,
        pickup_address: formData.pickup_address || null,
        pickup_city: formData.pickup_city || null,
        pickup_country: formData.pickup_country || null,
        pickup_date: formData.pickup_date || null,
        delivery_address: formData.delivery_address || null,
        delivery_city: formData.delivery_city || null,
        delivery_country: formData.delivery_country || null,
        delivery_date: formData.delivery_date || null,
        rate: formData.rate ? Number.parseFloat(formData.rate) : null,
        currency: formData.currency,
        special_instructions: formData.special_instructions || null,
        status: formData.status,
        origin_metadata: formData.quote_id
          ? {
              source: "quote",
              quote_id: formData.quote_id,
            }
          : null,
      }

      try {
        if (mode === "create") {
          const result = await createLoad({
            ...payload,
            status: "pending",
          })

          if (!result.success) {
            throw new Error(result.error ?? "Failed to create load")
          }

          toast.success("Load created successfully")
          resetForm({ customer_id: formData.customer_id, quote_id: formData.quote_id })
          if (result.loadId) {
            onSuccess?.(result.loadId)
          }
        } else if (loadId) {
          const result = await updateLoad(loadId, payload)

          if (!result.success) {
            throw new Error(result.error ?? "Failed to update load")
          }

          toast.success("Load updated successfully")
          onSuccess?.(loadId)
        }

        router.refresh()
      } catch (error) {
        console.error("Failed to submit load form", error)
        const message = error instanceof Error ? error.message : "Failed to save load"
        toast.error(message)
        setFormError(message)
      } finally {
        setIsSubmitting(false)
      }
    },
    [formData, loadId, mode, onSuccess, resetForm, router, user?.company_id],
  )

  if (userLoading || (mode === "edit" && isPrefilling)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!user || !["super_admin", "company_admin", "manager", "dispatcher"].includes(user.role)) {
    router.push("/dashboard")
    return null
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="load_number">Load Number *</Label>
              <Input
                id="load_number"
                required
                value={formData.load_number}
                readOnly={mode === "create"}
                onChange={(event) => handleFieldChange("load_number", event.target.value)}
                placeholder={
                  mode === "create"
                    ? formData.customer_id
                      ? isGeneratingNumber
                        ? "Generating load number..."
                        : "Auto-generated"
                      : "Select a customer to generate"
                    : "Enter load number"
                }
                className="font-mono"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {mode === "create"
                  ? formData.customer_id
                    ? isGeneratingNumber
                      ? "Generating load number..."
                      : "Load number auto-generated per customer."
                    : "Select a customer to auto-generate a load number."
                  : "Load number can be adjusted if necessary."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_id">Customer *</Label>
              <Select value={formData.customer_id} onValueChange={handleCustomerChange} required>
                <SelectTrigger id="customer_id">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(event) => handleFieldChange("description", event.target.value)}
                placeholder="Describe the cargo/shipment"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight_kg">Weight (kg)</Label>
                <Input
                  id="weight_kg"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.weight_kg}
                  onChange={(event) => handleFieldChange("weight_kg", event.target.value)}
                  placeholder="1000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="volume_m3">Volume (m³)</Label>
                <Input
                  id="volume_m3"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.volume_m3}
                  onChange={(event) => handleFieldChange("volume_m3", event.target.value)}
                  placeholder="50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pickup Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pickup_address">Pickup Address *</Label>
              <Textarea
                id="pickup_address"
                required
                value={formData.pickup_address}
                onChange={(event) => handleFieldChange("pickup_address", event.target.value)}
                placeholder="Full pickup address"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pickup_city">City</Label>
                <Input
                  id="pickup_city"
                  value={formData.pickup_city}
                  onChange={(event) => handleFieldChange("pickup_city", event.target.value)}
                  placeholder="Johannesburg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickup_country">Country</Label>
                <Select
                  value={formData.pickup_country}
                  onValueChange={(value) => handleFieldChange("pickup_country", value)}
                >
                  <SelectTrigger id="pickup_country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_OPTIONS.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickup_date">Pickup Date</Label>
              <Input
                id="pickup_date"
                type="datetime-local"
                value={formData.pickup_date}
                onChange={(event) => handleFieldChange("pickup_date", event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delivery_address">Delivery Address *</Label>
              <Textarea
                id="delivery_address"
                required
                value={formData.delivery_address}
                onChange={(event) => handleFieldChange("delivery_address", event.target.value)}
                placeholder="Full delivery address"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delivery_city">City</Label>
                <Input
                  id="delivery_city"
                  value={formData.delivery_city}
                  onChange={(event) => handleFieldChange("delivery_city", event.target.value)}
                  placeholder="Cape Town"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery_country">Country</Label>
                <Select
                  value={formData.delivery_country}
                  onValueChange={(value) => handleFieldChange("delivery_country", value)}
                >
                  <SelectTrigger id="delivery_country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_OPTIONS.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery_date">Delivery Date</Label>
              <Input
                id="delivery_date"
                type="datetime-local"
                value={formData.delivery_date}
                onChange={(event) => handleFieldChange("delivery_date", event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing & Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rate">Rate</Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.rate}
                  onChange={(event) => handleFieldChange("rate", event.target.value)}
                  placeholder="5000.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value: CurrencyCode) => handleFieldChange("currency", value)}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="special_instructions">Special Instructions</Label>
              <Textarea
                id="special_instructions"
                value={formData.special_instructions}
                onChange={(event) => handleFieldChange("special_instructions", event.target.value)}
                placeholder="Any handling requirements or notes"
                rows={3}
              />
            </div>

            {mode === "edit" && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: LoadStatus) => handleFieldChange("status", value)}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (mode === "create" ? "Creating..." : "Saving...") : mode === "create" ? "Create Load" : "Save Changes"}
        </Button>
      </div>
    </form>
  )
}
