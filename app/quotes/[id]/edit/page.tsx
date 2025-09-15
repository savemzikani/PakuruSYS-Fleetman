"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/lib/hooks/use-user"
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Quote, Customer, Load, CurrencyCode } from "@/lib/types/database"

interface QuoteItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

interface EditQuotePageProps {
  params: { id: string }
}

export default function EditQuotePage({ params }: EditQuotePageProps) {
  const { user, loading } = useUser()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loads, setLoads] = useState<Load[]>([])

  const [formData, setFormData] = useState({
    quote_number: "",
    customer_id: "",
    load_id: "",
    quote_date: "",
    valid_until: "",
    currency: "USD" as CurrencyCode,
    tax_rate: "15",
    notes: "",
    terms: "",
  })

  const [items, setItems] = useState<QuoteItem[]>([
    {
      id: "1",
      description: "",
      quantity: 1,
      unit_price: 0,
      total: 0,
    },
  ])

  // Fetch quote data and related data on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.company_id || !params.id) return

      const supabase = createClient()
      
      // Fetch quote, customers, and loads in parallel
      const [
        { data: quoteData, error: quoteError },
        { data: customersData },
        { data: loadsData }
      ] = await Promise.all([
        supabase
          .from("quotes")
          .select("*")
          .eq("id", params.id)
          .eq("company_id", user.company_id)
          .single(),
        supabase
          .from("customers")
          .select("*")
          .eq("company_id", user.company_id)
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("loads")
          .select("*, customer:customers(name)")
          .eq("company_id", user.company_id)
          .in("status", ["pending", "assigned"])
          .order("created_at", { ascending: false }),
      ])

      if (quoteError || !quoteData) {
        setError("Quote not found")
        return
      }

      setQuote(quoteData)
      setCustomers(customersData || [])
      setLoads(loadsData || [])

      // Populate form with existing quote data
      setFormData({
        quote_number: quoteData.quote_number,
        customer_id: quoteData.customer_id,
        load_id: quoteData.load_id || "",
        quote_date: quoteData.quote_date,
        valid_until: quoteData.valid_until,
        currency: quoteData.currency,
        tax_rate: ((quoteData.tax_amount / quoteData.subtotal) * 100).toFixed(1),
        notes: quoteData.notes || "",
        terms: quoteData.terms || "",
      })

      // Set initial items (simplified - in real app would fetch from quote_items table)
      setItems([
        {
          id: "1",
          description: "Transportation Services",
          quantity: 1,
          unit_price: quoteData.subtotal,
          total: quoteData.subtotal,
        }
      ])

      setIsLoading(false)
    }

    fetchData()
  }, [user, params.id])

  if (loading || isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  if (!user || !["super_admin", "company_admin", "manager"].includes(user.role)) {
    router.push("/dashboard")
    return null
  }

  if (!quote) {
    return <div className="flex items-center justify-center h-64">Quote not found</div>
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleItemChange = (itemId: string, field: string, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value }
          if (field === "quantity" || field === "unit_price") {
            updatedItem.total = updatedItem.quantity * updatedItem.unit_price
          }
          return updatedItem
        }
        return item
      })
    )
  }

  const addItem = () => {
    const newItem: QuoteItem = {
      id: Date.now().toString(),
      description: "",
      quantity: 1,
      unit_price: 0,
      total: 0,
    }
    setItems((prev) => [...prev, newItem])
  }

  const removeItem = (itemId: string) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((item) => item.id !== itemId))
    }
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const taxRate = parseFloat(formData.tax_rate) / 100
    const taxAmount = subtotal * taxRate
    const total = subtotal + taxAmount

    return { subtotal, taxAmount, total }
  }

  const { subtotal, taxAmount, total } = calculateTotals()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()

      const quoteData = {
        quote_number: formData.quote_number,
        customer_id: formData.customer_id,
        load_id: formData.load_id || null,
        quote_date: formData.quote_date,
        valid_until: formData.valid_until,
        subtotal,
        tax_amount: taxAmount,
        total_amount: total,
        currency: formData.currency,
        notes: formData.notes || null,
        terms: formData.terms || null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from("quotes")
        .update(quoteData)
        .eq("id", params.id)
        .eq("company_id", user.company_id)

      if (error) throw error

      router.push(`/quotes/${params.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/quotes/${params.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Quote
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Edit Quote: {quote.quote_number}
          </h1>
          <p className="text-muted-foreground">Update quote information and details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Quote Information */}
          <Card>
            <CardHeader>
              <CardTitle>Quote Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quote_number">Quote Number *</Label>
                  <Input
                    id="quote_number"
                    required
                    value={formData.quote_number}
                    onChange={(e) => handleInputChange("quote_number", e.target.value)}
                    placeholder="QU-123456"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <Select value={formData.currency} onValueChange={(value) => handleInputChange("currency", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="ZAR">ZAR</SelectItem>
                      <SelectItem value="BWP">BWP</SelectItem>
                      <SelectItem value="NAD">NAD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quote_date">Quote Date *</Label>
                  <Input
                    id="quote_date"
                    type="date"
                    required
                    value={formData.quote_date}
                    onChange={(e) => handleInputChange("quote_date", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valid_until">Valid Until *</Label>
                  <Input
                    id="valid_until"
                    type="date"
                    required
                    value={formData.valid_until}
                    onChange={(e) => handleInputChange("valid_until", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_id">Customer *</Label>
                <Select value={formData.customer_id} onValueChange={(value) => handleInputChange("customer_id", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
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
                    <SelectValue placeholder="Select a load (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No load selected</SelectItem>
                    {loads.map((load) => (
                      <SelectItem key={load.id} value={load.id}>
                        {load.load_number} - {load.customer?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Terms and Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Terms & Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.tax_rate}
                  onChange={(e) => handleInputChange("tax_rate", e.target.value)}
                  placeholder="15"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="terms">Terms & Conditions</Label>
                <Textarea
                  id="terms"
                  value={formData.terms}
                  onChange={(e) => handleInputChange("terms", e.target.value)}
                  placeholder="Payment due within 30 days of quote acceptance..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Internal notes for this quote..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quote Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Quote Items</CardTitle>
              <Button type="button" variant="outline" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-4 items-end">
                  <div className="col-span-5">
                    <Label htmlFor={`description-${item.id}`}>Description</Label>
                    <Input
                      id={`description-${item.id}`}
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                      placeholder="Transportation services..."
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor={`quantity-${item.id}`}>Quantity</Label>
                    <Input
                      id={`quantity-${item.id}`}
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(item.id, "quantity", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor={`unit_price-${item.id}`}>Unit Price</Label>
                    <Input
                      id={`unit_price-${item.id}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(item.id, "unit_price", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Total</Label>
                    <Input
                      value={item.total.toFixed(2)}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="col-span-1">
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Quote Totals */}
            <div className="mt-6 flex justify-end">
              <div className="w-80 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">{subtotal.toFixed(2)} {formData.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax ({formData.tax_rate}%):</span>
                  <span className="font-medium">{taxAmount.toFixed(2)} {formData.currency}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>{total.toFixed(2)} {formData.currency}</span>
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
          <Link href={`/quotes/${params.id}`}>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || items.some(item => !item.description || item.quantity <= 0 || item.unit_price <= 0)}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? "Updating Quote..." : "Update Quote"}
          </Button>
        </div>
      </form>
    </div>
  )
}