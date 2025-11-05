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
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import type { LoadStatus, CurrencyCode, Customer } from "@/lib/types/database"

export default function CreateLoadPage() {
  const { user, loading } = useUser()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])

  const [formData, setFormData] = useState({
    load_number: "",
    customer_id: "",
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
    currency: "USD" as CurrencyCode,
    special_instructions: "",
  })

  // Fetch customers on component mount
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!user?.company_id) return

      const supabase = createClient()
      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("company_id", user.company_id)
        .eq("is_active", true)
        .order("name")

      if (data) setCustomers(data)
    }

    fetchCustomers()
  }, [user])

  // Generate load number
  useEffect(() => {
    const generateLoadNumber = () => {
      const date = new Date()
      const year = date.getFullYear().toString().slice(-2)
      const month = (date.getMonth() + 1).toString().padStart(2, "0")
      const random = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0")
      return `LD${year}${month}${random}`
    }

    if (!formData.load_number) {
      setFormData((prev) => ({ ...prev, load_number: generateLoadNumber() }))
    }
  }, [formData.load_number])

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  if (!user || !["super_admin", "company_admin", "manager", "dispatcher"].includes(user.role)) {
    router.push("/dashboard")
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()

      const loadData = {
        company_id: user.company_id,
        load_number: formData.load_number,
        customer_id: formData.customer_id,
        description: formData.description || null,
        weight_kg: formData.weight_kg ? Number.parseFloat(formData.weight_kg) : null,
        volume_m3: formData.volume_m3 ? Number.parseFloat(formData.volume_m3) : null,
        pickup_address: formData.pickup_address,
        pickup_city: formData.pickup_city || null,
        pickup_country: formData.pickup_country || null,
        pickup_date: formData.pickup_date || null,
        delivery_address: formData.delivery_address,
        delivery_city: formData.delivery_city || null,
        delivery_country: formData.delivery_country || null,
        delivery_date: formData.delivery_date || null,
        rate: formData.rate ? Number.parseFloat(formData.rate) : null,
        currency: formData.currency,
        special_instructions: formData.special_instructions || null,
        status: "pending" as LoadStatus,
        dispatcher_id: user.id,
      }

      const { error } = await supabase.from("loads").insert([loadData])

      if (error) throw error

      router.push("/loads")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/loads">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Loads
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create New Load</h1>
          <p className="text-muted-foreground">Add a new shipment to the system</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Basic Information */}
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
                  onChange={(e) => handleInputChange("load_number", e.target.value)}
                  placeholder="Auto-generated"
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
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
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
                    onChange={(e) => handleInputChange("weight_kg", e.target.value)}
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
                    onChange={(e) => handleInputChange("volume_m3", e.target.value)}
                    placeholder="50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pickup Information */}
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
                  onChange={(e) => handleInputChange("pickup_address", e.target.value)}
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
                    onChange={(e) => handleInputChange("pickup_city", e.target.value)}
                    placeholder="Johannesburg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup_country">Country</Label>
                  <Select
                    value={formData.pickup_country}
                    onValueChange={(value) => handleInputChange("pickup_country", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="South Africa">South Africa</SelectItem>
                      <SelectItem value="Botswana">Botswana</SelectItem>
                      <SelectItem value="Namibia">Namibia</SelectItem>
                      <SelectItem value="Zimbabwe">Zimbabwe</SelectItem>
                      <SelectItem value="Zambia">Zambia</SelectItem>
                      <SelectItem value="Mozambique">Mozambique</SelectItem>
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
                  onChange={(e) => handleInputChange("pickup_date", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Delivery Information */}
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
                  onChange={(e) => handleInputChange("delivery_address", e.target.value)}
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
                    onChange={(e) => handleInputChange("delivery_city", e.target.value)}
                    placeholder="Cape Town"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery_country">Country</Label>
                  <Select
                    value={formData.delivery_country}
                    onValueChange={(value) => handleInputChange("delivery_country", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="South Africa">South Africa</SelectItem>
                      <SelectItem value="Botswana">Botswana</SelectItem>
                      <SelectItem value="Namibia">Namibia</SelectItem>
                      <SelectItem value="Zimbabwe">Zimbabwe</SelectItem>
                      <SelectItem value="Zambia">Zambia</SelectItem>
                      <SelectItem value="Mozambique">Mozambique</SelectItem>
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
                  onChange={(e) => handleInputChange("delivery_date", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Instructions */}
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
                    onChange={(e) => handleInputChange("rate", e.target.value)}
                    placeholder="5000.00"
                  />
                </div>
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
                      <SelectItem value="ZWL">ZWL - Zimbabwean Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="special_instructions">Special Instructions</Label>
                <Textarea
                  id="special_instructions"
                  value={formData.special_instructions}
                  onChange={(e) => handleInputChange("special_instructions", e.target.value)}
                  placeholder="Any special handling requirements, delivery instructions, etc."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Link href="/loads">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? "Creating Load..." : "Create Load"}
          </Button>
        </div>
      </form>
    </div>
  )
}
