"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/lib/hooks/use-user"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { VehicleStatus } from "@/lib/types/database"

export default function AddVehiclePage() {
  const { user, loading } = useUser()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    registration_number: "",
    make: "",
    model: "",
    year: "",
    vin: "",
    engine_number: "",
    fuel_type: "",
    capacity_tons: "",
    status: "active" as VehicleStatus,
    insurance_expiry: "",
    license_expiry: "",
    last_service_date: "",
    next_service_due: "",
    odometer_reading: "",
  })

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  if (!user || !["super_admin", "company_admin", "manager"].includes(user.role)) {
    router.push("/dashboard")
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()

      const vehicleData = {
        company_id: user.company_id,
        registration_number: formData.registration_number,
        make: formData.make || null,
        model: formData.model || null,
        year: formData.year ? Number.parseInt(formData.year) : null,
        vin: formData.vin || null,
        engine_number: formData.engine_number || null,
        fuel_type: formData.fuel_type || null,
        capacity_tons: formData.capacity_tons ? Number.parseFloat(formData.capacity_tons) : null,
        status: formData.status,
        insurance_expiry: formData.insurance_expiry || null,
        license_expiry: formData.license_expiry || null,
        last_service_date: formData.last_service_date || null,
        next_service_due: formData.next_service_due || null,
        odometer_reading: formData.odometer_reading ? Number.parseInt(formData.odometer_reading) : 0,
      }

      const { error } = await supabase.from("vehicles").insert([vehicleData])

      if (error) throw error

      router.push("/fleet")
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
        <Link href="/fleet">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Fleet
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Add New Vehicle</h1>
          <p className="text-muted-foreground">Add a new vehicle to your fleet</p>
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
                <Label htmlFor="registration_number">Registration Number *</Label>
                <Input
                  id="registration_number"
                  required
                  value={formData.registration_number}
                  onChange={(e) => handleInputChange("registration_number", e.target.value)}
                  placeholder="e.g., GP123ABC"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="make">Make</Label>
                  <Input
                    id="make"
                    value={formData.make}
                    onChange={(e) => handleInputChange("make", e.target.value)}
                    placeholder="e.g., Volvo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => handleInputChange("model", e.target.value)}
                    placeholder="e.g., FH16"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    min="1990"
                    max="2030"
                    value={formData.year}
                    onChange={(e) => handleInputChange("year", e.target.value)}
                    placeholder="2020"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity_tons">Capacity (Tons)</Label>
                  <Input
                    id="capacity_tons"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.capacity_tons}
                    onChange={(e) => handleInputChange("capacity_tons", e.target.value)}
                    placeholder="30.0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: VehicleStatus) => handleInputChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="out_of_service">Out of Service</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Technical Details */}
          <Card>
            <CardHeader>
              <CardTitle>Technical Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vin">VIN Number</Label>
                <Input
                  id="vin"
                  value={formData.vin}
                  onChange={(e) => handleInputChange("vin", e.target.value)}
                  placeholder="Vehicle Identification Number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="engine_number">Engine Number</Label>
                <Input
                  id="engine_number"
                  value={formData.engine_number}
                  onChange={(e) => handleInputChange("engine_number", e.target.value)}
                  placeholder="Engine identification number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fuel_type">Fuel Type</Label>
                <Select value={formData.fuel_type} onValueChange={(value) => handleInputChange("fuel_type", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select fuel type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="petrol">Petrol</SelectItem>
                    <SelectItem value="electric">Electric</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="odometer_reading">Current Odometer Reading (km)</Label>
                <Input
                  id="odometer_reading"
                  type="number"
                  min="0"
                  value={formData.odometer_reading}
                  onChange={(e) => handleInputChange("odometer_reading", e.target.value)}
                  placeholder="150000"
                />
              </div>
            </CardContent>
          </Card>

          {/* Compliance & Maintenance */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Compliance & Maintenance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="insurance_expiry">Insurance Expiry</Label>
                  <Input
                    id="insurance_expiry"
                    type="date"
                    value={formData.insurance_expiry}
                    onChange={(e) => handleInputChange("insurance_expiry", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="license_expiry">License Expiry</Label>
                  <Input
                    id="license_expiry"
                    type="date"
                    value={formData.license_expiry}
                    onChange={(e) => handleInputChange("license_expiry", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_service_date">Last Service Date</Label>
                  <Input
                    id="last_service_date"
                    type="date"
                    value={formData.last_service_date}
                    onChange={(e) => handleInputChange("last_service_date", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="next_service_due">Next Service Due</Label>
                  <Input
                    id="next_service_due"
                    type="date"
                    value={formData.next_service_due}
                    onChange={(e) => handleInputChange("next_service_due", e.target.value)}
                  />
                </div>
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
          <Link href="/fleet">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? "Adding Vehicle..." : "Add Vehicle"}
          </Button>
        </div>
      </form>
    </div>
  )
}
