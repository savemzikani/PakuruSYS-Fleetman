"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useUser } from "@/lib/hooks/use-user"
import { createClient } from "@/lib/supabase/client"
import { createQuote, updateQuote } from "@/app/financial/quotes/actions"
import type { CurrencyCode, Customer, Quote, QuoteItem, QuoteStatus } from "@/lib/types/database"

type QuoteFormMode = "create" | "edit"

type QuoteFormProps = {
  mode: QuoteFormMode
  quoteId?: string
  defaultCustomerId?: string | null
  onSuccess?: (quoteId: string) => void
  onCancel?: () => void
}

type QuoteFormState = {
  quote_number: string
  customer_id: string
  status: QuoteStatus
  valid_from: string
  valid_until: string
  currency: CurrencyCode
  tax_rate: string
  notes: string
}

type QuoteLineItem = {
  id: string
  description: string
  quantity: number
  unit_price: number
  line_total: number
}

const EMPTY_FORM: QuoteFormState = {
  quote_number: "",
  customer_id: "",
  status: "draft",
  valid_from: new Date().toISOString().split("T")[0],
  valid_until: "",
  currency: "USD",
  tax_rate: "0",
  notes: "",
}

const QUOTE_STATUS_OPTIONS: QuoteStatus[] = [
  "draft",
  "sent",
  "approved",
  "accepted",
  "rejected",
  "expired",
  "converted",
]

const createItemId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `item_${Math.random().toString(36).slice(2, 10)}`

const createEmptyLineItem = (): QuoteLineItem => ({
  id: createItemId(),
  description: "",
  quantity: 1,
  unit_price: 0,
  line_total: 0,
})

export function QuoteForm({ mode, quoteId, defaultCustomerId, onSuccess, onCancel }: QuoteFormProps) {
  const { user, loading: userLoading } = useUser()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [customers, setCustomers] = useState<Customer[]>([])
  const [formData, setFormData] = useState<QuoteFormState>(EMPTY_FORM)
  const [items, setItems] = useState<QuoteLineItem[]>(() => [createEmptyLineItem()])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeneratingNumber, setIsGeneratingNumber] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isPrefilling, setIsPrefilling] = useState(mode === "edit")

  const pendingCustomerIdRef = useRef<string | null>(null)
  const initialCustomerHandledRef = useRef(false)

  const filteredItems = useMemo(
    () => items.filter((item) => item.description.trim() !== ""),
    [items],
  )

  const subtotal = useMemo(
    () =>
      filteredItems.reduce((sum, item) => {
        const lineTotal = item.quantity * item.unit_price
        return sum + (Number.isFinite(lineTotal) ? lineTotal : 0)
      }, 0),
    [filteredItems],
  )

  const taxRateValue = Number.parseFloat(formData.tax_rate || "0")
  const taxAmount = Number.isFinite(taxRateValue) ? subtotal * (taxRateValue / 100) : 0
  const totalAmount = subtotal + taxAmount

  useEffect(() => {
    if (!user?.company_id) return

    const loadCustomers = async () => {
      const { data, error } = await supabase
        .from("customers")
        .select(
          `id, name, default_payment_terms, default_currency, default_tax_rate, auto_email_invoices, requires_po_number, invoice_delivery_email`,
        )
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

  const applyCustomerDefaults = useCallback(
    (customerId: string) => {
      const customer = customers.find((c) => c.id === customerId)
      if (!customer) return

      setFormData((prev) => {
        const next: QuoteFormState = {
          ...prev,
          currency: mode === "create" && customer.default_currency ? (customer.default_currency as CurrencyCode) : prev.currency,
          tax_rate:
            mode === "create" && customer.default_tax_rate !== null && customer.default_tax_rate !== undefined
              ? customer.default_tax_rate.toString()
              : prev.tax_rate,
        }

        if (mode === "create" && customer.default_payment_terms) {
          const start = new Date()
          const validUntil = new Date(start.getTime() + customer.default_payment_terms * 24 * 60 * 60 * 1000)
          next.valid_from = start.toISOString().split("T")[0]
          next.valid_until = validUntil.toISOString().split("T")[0]
        }

        return next
      })
    },
    [customers, mode],
  )

  const buildFallbackQuoteNumber = useCallback(() => {
    const now = new Date()
    const year = now.getFullYear().toString().slice(-2)
    const month = (now.getMonth() + 1).toString().padStart(2, "0")
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")
    return `QT-${year}${month}-${random}`
  }, [])

  const generateQuoteNumber = useCallback(
    async (customerId: string) => {
      if (mode !== "create" || !user?.company_id || !customerId) return

      pendingCustomerIdRef.current = customerId
      setIsGeneratingNumber(true)

      try {
        const { data, error } = await supabase.rpc("next_document_number", {
          doc_type: "quote",
          in_company_id: user.company_id,
          in_customer_id: customerId,
        })

        if (error) throw error

        if (pendingCustomerIdRef.current === customerId) {
          setFormData((prev) => ({
            ...prev,
            quote_number: (data as string | null) ?? prev.quote_number,
          }))
        }
      } catch (error) {
        console.error("Failed to generate quote number", error)
        if (pendingCustomerIdRef.current === customerId) {
          setFormData((prev) => ({
            ...prev,
            quote_number: prev.quote_number || buildFallbackQuoteNumber(),
          }))
        }
      } finally {
        if (pendingCustomerIdRef.current === customerId) {
          pendingCustomerIdRef.current = null
          setIsGeneratingNumber(false)
        }
      }
    },
    [buildFallbackQuoteNumber, mode, supabase, user?.company_id],
  )

  useEffect(() => {
    if (mode !== "create" || !defaultCustomerId || initialCustomerHandledRef.current) return

    initialCustomerHandledRef.current = true
    setFormData((prev) => ({ ...prev, customer_id: defaultCustomerId }))
    applyCustomerDefaults(defaultCustomerId)
    void generateQuoteNumber(defaultCustomerId)
  }, [applyCustomerDefaults, defaultCustomerId, generateQuoteNumber, mode])

  useEffect(() => {
    if (mode !== "edit" || !quoteId || !user?.company_id) return

    const loadQuote = async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select(
          `*,
          items:quote_items(id, line_number, description, quantity, unit_price, line_total)
        `,
        )
        .eq("company_id", user.company_id)
        .eq("id", quoteId)
        .single()

      if (error || !data) {
        console.error("Failed to fetch quote", error)
        toast.error("Unable to load quote")
        setIsPrefilling(false)
        return
      }

      const quote = data as Quote & { items?: QuoteItem[] }

      setFormData({
        quote_number: quote.quote_number ?? "",
        customer_id: quote.customer_id ?? "",
        status: (quote.status as QuoteStatus) ?? "draft",
        valid_from: quote.valid_from ?? new Date().toISOString().split("T")[0],
        valid_until: quote.valid_until ?? "",
        currency: (quote.currency as CurrencyCode) ?? "USD",
        tax_rate: quote.tax_rate !== null && quote.tax_rate !== undefined ? quote.tax_rate.toString() : "0",
        notes: quote.notes ?? "",
      })

      const sortedItems = [...(quote.items ?? [])]
        .sort((a, b) => (Number(a.line_number ?? 0) || 0) - (Number(b.line_number ?? 0) || 0))
        .map<QuoteLineItem>((item) => ({
          id: createItemId(),
          description: item.description ?? "",
          quantity: Number(item.quantity ?? 0) || 0,
          unit_price: Number(item.unit_price ?? 0) || 0,
          line_total: Number(item.line_total ?? 0) || 0,
        }))

      setItems(sortedItems.length > 0 ? sortedItems : [createEmptyLineItem()])
      setIsPrefilling(false)
    }

    void loadQuote()
  }, [mode, quoteId, supabase, user?.company_id])

  const handleCustomerChange = useCallback(
    (customerId: string) => {
      setFormData((prev) => ({
        ...prev,
        customer_id: customerId,
        quote_number: mode === "create" ? "" : prev.quote_number,
      }))

      if (mode === "create" && customerId) {
        applyCustomerDefaults(customerId)
        void generateQuoteNumber(customerId)
      }
    },
    [applyCustomerDefaults, generateQuoteNumber, mode],
  )

  const handleFieldChange = useCallback((field: keyof QuoteFormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleItemChange = useCallback((id: string, field: keyof QuoteLineItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item

        const nextItem: QuoteLineItem = { ...item, [field]: value }
        if (field === "quantity" || field === "unit_price") {
          const quantity = field === "quantity" ? Number(value) : item.quantity
          const unitPrice = field === "unit_price" ? Number(value) : item.unit_price
          nextItem.line_total = Number.isFinite(quantity * unitPrice) ? quantity * unitPrice : 0
          nextItem.quantity = quantity
          nextItem.unit_price = unitPrice
        }

        if (field === "line_total") {
          nextItem.line_total = Number(value)
        }

        if (field === "description") {
          nextItem.description = value as string
        }

        return nextItem
      }),
    )
  }, [])

  const handleAddItem = useCallback(() => {
    setItems((prev) => [...prev, createEmptyLineItem()])
  }, [])

  const handleRemoveItem = useCallback((id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev))
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

      if (!formData.quote_number) {
        setFormError("Quote number is required")
        return
      }

      if (filteredItems.length === 0) {
        setFormError("Add at least one line item")
        return
      }

      setFormError(null)
      setIsSubmitting(true)

      const payload = {
        customer_id: formData.customer_id,
        quote_number: formData.quote_number || null,
        status: formData.status,
        valid_from: formData.valid_from ? new Date(formData.valid_from) : null,
        valid_until: formData.valid_until ? new Date(formData.valid_until) : null,
        currency: formData.currency,
        tax_rate: Number.isFinite(taxRateValue) ? taxRateValue : 0,
        notes: formData.notes || null,
        items: filteredItems.map((item) => ({
          description: item.description,
          quantity: Number.isFinite(item.quantity) ? item.quantity : 0,
          unit_price: Number.isFinite(item.unit_price) ? item.unit_price : 0,
        })),
      }

      try {
        if (mode === "create") {
          const result = await createQuote(payload)

          if (!result.success) {
            throw new Error(result.error ?? "Failed to create quote")
          }

          toast.success("Quote created successfully")
          router.refresh()
          if (result.quoteId) {
            onSuccess?.(result.quoteId)
          }
          setFormData((prev) => ({ ...EMPTY_FORM, currency: prev.currency }))
          setItems([createEmptyLineItem()])
        } else if (mode === "edit" && quoteId) {
          const result = await updateQuote(quoteId, payload)

          if (!result.success) {
            throw new Error(result.error ?? "Failed to update quote")
          }

          toast.success("Quote updated successfully")
          router.refresh()
          onSuccess?.(quoteId)
        }
      } catch (error) {
        console.error("Failed to submit quote", error)
        const message = error instanceof Error ? error.message : "Failed to save quote"
        toast.error(message)
        setFormError(message)
      } finally {
        setIsSubmitting(false)
      }
    },
    [filteredItems, formData, mode, onSuccess, quoteId, router, taxRateValue, user?.company_id],
  )

  if (userLoading || isPrefilling) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading quote data...</p>
      </div>
    )
  }

  if (!user || !["super_admin", "company_admin", "manager", "dispatcher"].includes(user.role)) {
    router.push("/dashboard")
    return null
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quote Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="quote_number">Quote Number *</Label>
            <Input
              id="quote_number"
              required
              value={formData.quote_number}
              readOnly={mode === "create"}
              onChange={(event) => handleFieldChange("quote_number", event.target.value)}
              placeholder={
                isGeneratingNumber
                  ? "Generating quote number..."
                  : formData.customer_id
                    ? "Auto-generated"
                    : "Select a customer to generate"
              }
              className="font-mono"
              autoComplete="off"
            />
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
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value: QuoteStatus) => handleFieldChange("status", value)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUOTE_STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valid_from">Valid From</Label>
              <Input
                id="valid_from"
                type="date"
                value={formData.valid_from}
                onChange={(event) => handleFieldChange("valid_from", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valid_until">Valid Until</Label>
              <Input
                id="valid_until"
                type="date"
                value={formData.valid_until}
                onChange={(event) => handleFieldChange("valid_until", event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                  {[
                    "USD",
                    "ZAR",
                    "BWP",
                    "NAD",
                    "ZWL",
                    "ZMW",
                    "MZN",
                    "SZL",
                    "LSL",
                    "MWK",
                    "ANG",
                    "MGA",
                    "MUR",
                    "SCR",
                  ].map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_rate">Tax Rate (%)</Label>
              <Input
                id="tax_rate"
                type="number"
                min="0"
                step="0.01"
                value={formData.tax_rate}
                onChange={(event) => handleFieldChange("tax_rate", event.target.value)}
              />
            </div>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(event) => handleFieldChange("notes", event.target.value)}
              placeholder="Add any additional details or terms for this quote"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Line Items</CardTitle>
            <p className="text-sm text-muted-foreground">List the services or goods included in this quote.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
            <Plus className="mr-2 h-4 w-4" /> Add Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="grid gap-4 md:grid-cols-12 items-end border rounded-lg p-4">
              <div className="md:col-span-5 space-y-2">
                <Label htmlFor={`description-${item.id}`}>Description</Label>
                <Input
                  id={`description-${item.id}`}
                  value={item.description}
                  onChange={(event) => handleItemChange(item.id, "description", event.target.value)}
                  placeholder="Describe the service or product"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor={`quantity-${item.id}`}>Quantity</Label>
                <Input
                  id={`quantity-${item.id}`}
                  type="number"
                  min="0"
                  step="0.001"
                  value={item.quantity}
                  onChange={(event) => handleItemChange(item.id, "quantity", Number(event.target.value) || 0)}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor={`unit_price-${item.id}`}>Unit Price</Label>
                <Input
                  id={`unit_price-${item.id}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unit_price}
                  onChange={(event) => handleItemChange(item.id, "unit_price", Number(event.target.value) || 0)}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Total</Label>
                <Input value={item.line_total.toFixed(2)} readOnly className="bg-muted" />
              </div>
              <div className="md:col-span-1 flex justify-end">
                {items.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="md:col-span-12 flex items-center justify-between text-xs text-muted-foreground">
                <span>Item {index + 1}</span>
                <span>
                  Quantity × Unit Price = {item.quantity} × {item.unit_price.toFixed(2)} = {item.line_total.toFixed(2)}
                </span>
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>
                  {subtotal.toFixed(2)} {formData.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span>
                  Tax ({Number.isFinite(taxRateValue) ? taxRateValue.toFixed(2) : "0.00"}%):
                </span>
                <span>
                  {taxAmount.toFixed(2)} {formData.currency}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-semibold">
                <span>Total:</span>
                <span>
                  {totalAmount.toFixed(2)} {formData.currency}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {formError ? <p className="text-sm text-red-500" role="alert">{formError}</p> : null}

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (mode === "create" ? "Creating Quote..." : "Updating Quote...") : mode === "create" ? "Create Quote" : "Update Quote"}
        </Button>
      </div>
    </form>
  )
}
