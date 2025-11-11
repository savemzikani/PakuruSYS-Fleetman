"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/lib/hooks/use-user"
import { createInvoice } from "../actions"
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, useMemo } from "react"
import type { Customer, Load, CurrencyCode, Quote, QuoteItem } from "@/lib/types/database"

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

type QuotePrefillContext = {
  id: string
  customer_id: string | null
  load_id: string | null
}

const createItemId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `item_${Math.random().toString(36).slice(2, 10)}`

const createEmptyInvoiceItem = (): InvoiceItem => ({
  id: createItemId(),
  description: "",
  quantity: 1,
  unit_price: 0,
  total: 0,
})

export default function CreateInvoicePage() {
  const { user, loading } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loads, setLoads] = useState<Load[]>([])
  const [isGeneratingNumber, setIsGeneratingNumber] = useState(false)
  const [quoteContext, setQuoteContext] = useState<QuotePrefillContext | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const [formData, setFormData] = useState({
    invoice_number: "",
    customer_id: "",
    load_id: "",
    quote_id: "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: "",
    payment_terms: "30",
    currency: "USD" as CurrencyCode,
    tax_rate: "15",
    notes: "",
  })

  const [items, setItems] = useState<InvoiceItem[]>([createEmptyInvoiceItem()])

  const quoteId = searchParams.get("quoteId")

  // Fetch customers and loads on component mount
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.company_id) return

      const [{ data: customersData }, { data: loadsData }] = await Promise.all([
        supabase.from("customers").select("*").eq("company_id", user.company_id).eq("is_active", true).order("name"),
        supabase
          .from("loads")
          .select("*, customer:customers(name)")
          .eq("company_id", user.company_id)
          .order("created_at", { ascending: false }),
      ])

      if (customersData) setCustomers(customersData)
      if (loadsData) setLoads(loadsData)
    }

    const initialize = async () => {
      await fetchData()

      if (!quoteId || !user?.company_id) return

      const { data: quoteData, error: quoteError } = await supabase
        .from("quotes")
        .select(
          `*,
          items:quote_items(id, line_number, description, quantity, unit_price, line_total),
          converted_load_id,
          customer_id
        `,
        )
        .eq("company_id", user.company_id)
        .eq("id", quoteId)
        .single()

      if (quoteError || !quoteData) {
        console.error("Unable to load quote for invoice prefill", quoteError)
        return
      }

      const quote = quoteData as Quote & { items?: QuoteItem[] }

      setQuoteContext({
        id: quote.id,
        customer_id: quote.customer_id ?? null,
        load_id: quote.converted_load_id ?? null,
      })

      setFormData((prev) => ({
        ...prev,
        customer_id: quote.customer_id ?? prev.customer_id,
        load_id: quote.converted_load_id ?? prev.load_id,
        quote_id: quote.id,
        currency: (quote.currency as CurrencyCode) ?? prev.currency,
        tax_rate: quote.tax_rate !== null && quote.tax_rate !== undefined ? quote.tax_rate.toString() : prev.tax_rate,
        notes: quote.notes ?? prev.notes,
      }))

      if (quote.items && quote.items.length > 0) {
        setItems(
          quote.items
            .slice()
            .sort((a, b) => (a.line_number ?? 0) - (b.line_number ?? 0))
            .map((item) => ({
              id: createItemId(),
              description: item.description ?? "",
              quantity: Number(item.quantity ?? 0) || 0,
              unit_price: Number(item.unit_price ?? 0) || 0,
              total: Number(item.line_total ?? 0) || 0,
            })),
        )
      }
    }

    void initialize()
  }, [quoteId, supabase, user])

  const buildFallbackInvoiceNumber = () => {
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0")
    return `INV-${year}${month}-${random}`
  }

  useEffect(() => {
    if (!user?.company_id || !formData.customer_id) return

    let cancelled = false

    const generateInvoiceNumber = async () => {
      setIsGeneratingNumber(true)
      try {
        const { data, error } = await supabase.rpc("next_document_number", {
          doc_type: "invoice",
          in_company_id: user.company_id,
          in_customer_id: formData.customer_id,
        })

        if (error) throw error

        if (!cancelled) {
          setFormData((prev) => ({
            ...prev,
            invoice_number:
              ((data as string | null) ?? prev.invoice_number) || buildFallbackInvoiceNumber(),
          }))
        }
      } catch (err) {
        console.error("Failed to generate invoice number", err)
        if (!cancelled) {
          setFormData((prev) => ({
            ...prev,
            invoice_number: prev.invoice_number || buildFallbackInvoiceNumber(),
          }))
        }
      } finally {
        if (!cancelled) {
          setIsGeneratingNumber(false)
        }
      }
    }

    void generateInvoiceNumber()

    return () => {
      cancelled = true
    }
  }, [formData.customer_id, supabase, user?.company_id])

  // Calculate due date based on payment terms
  useEffect(() => {
    if (formData.invoice_date && formData.payment_terms) {
      const invoiceDate = new Date(formData.invoice_date)
      const dueDate = new Date(invoiceDate.getTime() + Number.parseInt(formData.payment_terms) * 24 * 60 * 60 * 1000)
      setFormData((prev) => ({ ...prev, due_date: dueDate.toISOString().split("T")[0] }))
    }
  }, [formData.invoice_date, formData.payment_terms])

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  if (!user || !["super_admin", "company_admin", "manager"].includes(user.role)) {
    router.push("/dashboard")
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.company_id) {
      setError("Missing company information")
      return
    }

    const filteredItems = items.filter((item) => item.description.trim() !== "")

    if (filteredItems.length === 0) {
      setError("Add at least one line item")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const invoiceDate = new Date(formData.invoice_date)

      if (Number.isNaN(invoiceDate.getTime())) {
        throw new Error("Invalid invoice date")
      }

      const dueDateValue = formData.due_date ? new Date(formData.due_date) : null

      if (formData.due_date && dueDateValue && Number.isNaN(dueDateValue.getTime())) {
        throw new Error("Invalid due date")
      }

      const payload = {
        invoice_number: formData.invoice_number || null,
        customer_id: formData.customer_id,
        load_id: formData.load_id || null,
        source_load_id: formData.load_id || quoteContext?.load_id || null,
        quote_id: formData.quote_id || null,
        invoice_date: invoiceDate,
        due_date: dueDateValue,
        payment_terms: Number.parseInt(formData.payment_terms, 10),
        currency: formData.currency,
        tax_rate: Number.parseFloat(formData.tax_rate),
        notes: formData.notes || null,
        items: filteredItems.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        origin_metadata: quoteContext
          ? {
              source: "quote",
              quote_id: quoteContext.id,
              load_id: quoteContext.load_id,
              auto_items: true,
            }
          : undefined,
        auto_items: Boolean(quoteContext),
      }

      const result = await createInvoice(payload)

      if (!result.success) {
        throw new Error(result.error ?? "Failed to create invoice")
      }

      router.push(result.invoiceId ? `/financial/invoices/${result.invoiceId}` : "/financial/invoices")
    } catch (err) {
      console.error("Invoice creation failed", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => {
      if (field === "customer_id") {
        return {
          ...prev,
          customer_id: value,
          invoice_number: "",
          quote_id: quoteContext && quoteContext.customer_id === value ? quoteContext.id : "",
        }
      }
      if (field === "load_id" && !value) {
        return { ...prev, load_id: "" }
      }
      return { ...prev, [field]: value }
    })

    if (field === "customer_id" && quoteContext && quoteContext.customer_id !== value) {
      setQuoteContext(null)
    }
  }

  const handleItemChange = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value }
          if (field === "quantity" || field === "unit_price") {
            updatedItem.total = updatedItem.quantity * updatedItem.unit_price
          }
          return updatedItem
        }
        return item
      }),
    )
  }

  const addItem = () => {
    setItems((prev) => [...prev, createEmptyInvoiceItem()])
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const subtotal = items.reduce((sum, item) => sum + item.total, 0)
  const taxAmount = subtotal * (Number.parseFloat(formData.tax_rate) / 100)
  const totalAmount = subtotal + taxAmount

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/financial/invoices">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create New Invoice</h1>
          <p className="text-muted-foreground">Generate an invoice for your customer</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invoice_number">Invoice Number *</Label>
                <Input
                  id="invoice_number"
                  required
                  value={formData.invoice_number}
                  onChange={(e) => handleInputChange("invoice_number", e.target.value)}
                  placeholder={
                    isGeneratingNumber
                      ? "Generating invoice number..."
                      : formData.customer_id
                        ? "Auto-generated"
                        : "Select a customer to generate"
                  }
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_id">Customer *</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) => handleInputChange("customer_id", value)}
                  required
                >
                  <SelectTrigger>
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
                <Label htmlFor="load_id">Related Load (Optional)</Label>
                <Select value={formData.load_id} onValueChange={(value) => handleInputChange("load_id", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select load" />
                  </SelectTrigger>
                  <SelectContent>
                    {loads.map((load) => (
                      <SelectItem key={load.id} value={load.id}>
                        {load.load_number} - {load.customer?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice_date">Invoice Date *</Label>
                  <Input
                    id="invoice_date"
                    type="date"
                    required
                    value={formData.invoice_date}
                    onChange={(e) => handleInputChange("invoice_date", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date *</Label>
                  <Input
                    id="due_date"
                    type="date"
                    required
                    value={formData.due_date}
                    onChange={(e) => handleInputChange("due_date", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Terms */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment_terms">Payment Terms (Days)</Label>
                <Select
                  value={formData.payment_terms}
                  onValueChange={(value) => handleInputChange("payment_terms", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Cash on Delivery</SelectItem>
                    <SelectItem value="7">7 Days</SelectItem>
                    <SelectItem value="14">14 Days</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                    <SelectItem value="45">45 Days</SelectItem>
                    <SelectItem value="60">60 Days</SelectItem>
                    <SelectItem value="90">90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value: CurrencyCode) => handleInputChange("currency", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
                      <SelectItem value="BWP">BWP - Botswana Pula</SelectItem>
                      <SelectItem value="NAD">NAD - Namibian Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.tax_rate}
                    onChange={(e) => handleInputChange("tax_rate", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Additional notes or payment instructions"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Invoice Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="grid gap-4 md:grid-cols-12 items-end">
                  <div className="md:col-span-5">
                    <Label htmlFor={`description-${item.id}`}>Description</Label>
                    <Input
                      id={`description-${item.id}`}
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                      placeholder="Service or product description"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor={`quantity-${item.id}`}>Quantity</Label>
                    <Input
                      id={`quantity-${item.id}`}
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(item.id, "quantity", Number.parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor={`unit_price-${item.id}`}>Unit Price</Label>
                    <Input
                      id={`unit_price-${item.id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(item.id, "unit_price", Number.parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Total</Label>
                    <Input value={item.total.toFixed(2)} readOnly className="bg-muted" />
                  </div>
                  <div className="md:col-span-1">
                    {items.length > 1 && (
                      <Button type="button" variant="outline" size="sm" onClick={() => removeItem(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Invoice Totals */}
            <div className="mt-6 border-t pt-4">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>
                      {subtotal.toFixed(2)} {formData.currency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax ({formData.tax_rate}%):</span>
                    <span>
                      {taxAmount.toFixed(2)} {formData.currency}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>
                      {totalAmount.toFixed(2)} {formData.currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Link href="/financial/invoices">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? "Creating Invoice..." : "Create Invoice"}
          </Button>
        </div>
      </form>
    </div>
  )
}
