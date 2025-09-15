"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Truck, Building2, Users, FileText, CheckCircle } from "lucide-react"

const steps = [
  { id: 1, title: "Company Information", icon: Building2 },
  { id: 2, title: "Fleet Details", icon: Truck },
  { id: 3, title: "Admin Account", icon: Users },
  { id: 4, title: "Review & Submit", icon: FileText },
]

export default function OnboardPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const [formData, setFormData] = useState({
    // Company Information
    companyName: "",
    registrationNumber: "",
    taxNumber: "",
    country: "",
    city: "",
    address: "",
    phone: "",
    email: "",
    website: "",

    // Fleet Details
    fleetSize: "",
    vehicleTypes: [] as string[],
    operatingRegions: [] as string[],
    specializations: [] as string[],

    // Admin Account
    adminFirstName: "",
    adminLastName: "",
    adminEmail: "",
    adminPhone: "",
    adminPassword: "",
    confirmPassword: "",
  })

  const handleNext = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1)
  }

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)

    if (formData.adminPassword !== formData.confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const isDevelopment = process.env.NODE_ENV === "development"

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.adminEmail,
        password: formData.adminPassword,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/dashboard`,
          data: {
            first_name: formData.adminFirstName,
            last_name: formData.adminLastName,
            role: "company_admin",
          },
          ...(isDevelopment && { emailRedirectTo: undefined }),
        },
      })

      if (authError) throw authError

      // Create company application record
      const { error: companyError } = await supabase.from("company_applications").insert({
        company_name: formData.companyName,
        registration_number: formData.registrationNumber,
        tax_number: formData.taxNumber,
        country: formData.country,
        city: formData.city,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        website: formData.website,
        fleet_size: Number.parseInt(formData.fleetSize),
        vehicle_types: formData.vehicleTypes,
        operating_regions: formData.operatingRegions,
        specializations: formData.specializations,
        admin_user_id: authData.user?.id,
        status: "pending",
      })

      if (companyError) throw companyError

      router.push("/onboard/success")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Registration Number *</Label>
                <Input
                  id="registrationNumber"
                  required
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxNumber">Tax Number</Label>
                <Input
                  id="taxNumber"
                  value={formData.taxNumber}
                  onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) => setFormData({ ...formData, country: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="south-africa">South Africa</SelectItem>
                    <SelectItem value="botswana">Botswana</SelectItem>
                    <SelectItem value="namibia">Namibia</SelectItem>
                    <SelectItem value="zambia">Zambia</SelectItem>
                    <SelectItem value="zimbabwe">Zimbabwe</SelectItem>
                    <SelectItem value="mozambique">Mozambique</SelectItem>
                    <SelectItem value="malawi">Malawi</SelectItem>
                    <SelectItem value="lesotho">Lesotho</SelectItem>
                    <SelectItem value="eswatini">Eswatini</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Business Address *</Label>
              <Textarea
                id="address"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Business Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fleetSize">Fleet Size *</Label>
              <Select
                value={formData.fleetSize}
                onValueChange={(value) => setFormData({ ...formData, fleetSize: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fleet size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-5">1-5 vehicles</SelectItem>
                  <SelectItem value="6-20">6-20 vehicles</SelectItem>
                  <SelectItem value="21-50">21-50 vehicles</SelectItem>
                  <SelectItem value="51-100">51-100 vehicles</SelectItem>
                  <SelectItem value="100+">100+ vehicles</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vehicle Types (Select all that apply)</Label>
              <div className="grid grid-cols-2 gap-2">
                {["Truck", "Trailer", "Tanker", "Flatbed", "Refrigerated", "Container"].map((type) => (
                  <label key={type} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.vehicleTypes.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, vehicleTypes: [...formData.vehicleTypes, type] })
                        } else {
                          setFormData({ ...formData, vehicleTypes: formData.vehicleTypes.filter((t) => t !== type) })
                        }
                      }}
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Operating Regions (Select all that apply)</Label>
              <div className="grid grid-cols-2 gap-2">
                {["Local", "Regional", "Cross-border", "International"].map((region) => (
                  <label key={region} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.operatingRegions.includes(region)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, operatingRegions: [...formData.operatingRegions, region] })
                        } else {
                          setFormData({
                            ...formData,
                            operatingRegions: formData.operatingRegions.filter((r) => r !== region),
                          })
                        }
                      }}
                    />
                    <span>{region}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Specializations (Select all that apply)</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "General Freight",
                  "Mining",
                  "Agriculture",
                  "Fuel Transport",
                  "Hazardous Materials",
                  "Perishables",
                ].map((spec) => (
                  <label key={spec} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.specializations.includes(spec)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, specializations: [...formData.specializations, spec] })
                        } else {
                          setFormData({
                            ...formData,
                            specializations: formData.specializations.filter((s) => s !== spec),
                          })
                        }
                      }}
                    />
                    <span>{spec}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adminFirstName">First Name *</Label>
                <Input
                  id="adminFirstName"
                  required
                  value={formData.adminFirstName}
                  onChange={(e) => setFormData({ ...formData, adminFirstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminLastName">Last Name *</Label>
                <Input
                  id="adminLastName"
                  required
                  value={formData.adminLastName}
                  onChange={(e) => setFormData({ ...formData, adminLastName: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Email Address *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  required
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminPhone">Phone Number *</Label>
                <Input
                  id="adminPhone"
                  required
                  value={formData.adminPhone}
                  onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adminPassword">Password *</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  required
                  value={formData.adminPassword}
                  onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Company Information</h3>
              <p>
                <strong>Company:</strong> {formData.companyName}
              </p>
              <p>
                <strong>Registration:</strong> {formData.registrationNumber}
              </p>
              <p>
                <strong>Country:</strong> {formData.country}
              </p>
              <p>
                <strong>Email:</strong> {formData.email}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">Fleet Details</h3>
              <p>
                <strong>Fleet Size:</strong> {formData.fleetSize}
              </p>
              <p>
                <strong>Vehicle Types:</strong> {formData.vehicleTypes.join(", ")}
              </p>
              <p>
                <strong>Operating Regions:</strong> {formData.operatingRegions.join(", ")}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">Admin Account</h3>
              <p>
                <strong>Name:</strong> {formData.adminFirstName} {formData.adminLastName}
              </p>
              <p>
                <strong>Email:</strong> {formData.adminEmail}
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="font-semibold text-yellow-900 mb-2">Next Steps</h3>
              <p>
                After submission, your application will be reviewed by our team. You'll receive an email confirmation
                and updates on your application status.
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Join SADC Logistics Network</h1>
          <p className="text-gray-600">Register your trucking company and start managing your fleet efficiently</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between mb-8">
          {steps.map((step) => {
            const Icon = step.icon
            const isActive = currentStep === step.id
            const isCompleted = currentStep > step.id

            return (
              <div key={step.id} className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isActive
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {isCompleted ? <CheckCircle className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                </div>
                <span className={`text-sm font-medium ${isActive ? "text-blue-600" : "text-gray-500"}`}>
                  {step.title}
                </span>
              </div>
            )
          })}
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>
              Step {currentStep}: {steps[currentStep - 1].title}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Tell us about your trucking company"}
              {currentStep === 2 && "Provide details about your fleet"}
              {currentStep === 3 && "Create your admin account"}
              {currentStep === 4 && "Review and submit your application"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderStepContent()}

            {error && <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 1}>
                Previous
              </Button>

              {currentStep < 4 ? (
                <Button onClick={handleNext}>Next</Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isLoading}>
                  {isLoading ? "Submitting..." : "Submit Application"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
