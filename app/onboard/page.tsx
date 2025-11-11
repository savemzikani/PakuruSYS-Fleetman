"use client"

import { useState, useTransition } from "react"
import type { ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { registerCompanyApplication, type RegisterCompanyApplicationInput } from "./actions"
import {
  COUNTRY_OPTIONS,
  FLEET_SIZE_OPTIONS,
  VEHICLE_TYPES,
  OPERATING_REGION_OPTIONS,
  SPECIALIZATION_OPTIONS,
} from "@/lib/constants/onboarding"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Truck, Building2, Users, FileText, CheckCircle } from "lucide-react"

const steps = [
  { id: 1, title: "Company Information", icon: Building2 },
  { id: 2, title: "Fleet Details", icon: Truck },
  { id: 3, title: "Admin Account", icon: Users },
  { id: 4, title: "Review & Submit", icon: FileText },
]

type OnboardingFormState = Omit<RegisterCompanyApplicationInput, "taxNumber" | "website"> & {
  taxNumber: string
  website: string
}

const STEP_FIELDS: Record<number, (keyof OnboardingFormState)[]> = {
  1: ["companyName", "registrationNumber", "country", "city", "address", "phone", "email"],
  2: ["fleetSize", "vehicleTypes", "operatingRegions", "specializations"],
  3: [
    "adminFirstName",
    "adminLastName",
    "adminEmail",
    "adminPhone",
    "adminPassword",
    "confirmPassword",
  ],
}

const EMAIL_PATTERN = /.+@.+\..+/

type ArrayField = "vehicleTypes" | "operatingRegions" | "specializations"

const CHECKBOX_ERROR_MESSAGES: Record<ArrayField, string> = {
  vehicleTypes: "Select at least one vehicle type",
  operatingRegions: "Select at least one operating region",
  specializations: "Select at least one specialization",
}

export default function OnboardPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const router = useRouter()

  const [formData, setFormData] = useState<OnboardingFormState>({
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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof OnboardingFormState, string>>>({})
  const [isPending, startTransition] = useTransition()

  const applyStepErrors = (step: number, errorsForStep: Partial<Record<keyof OnboardingFormState, string>>) => {
    setFieldErrors((prev) => {
      const updated = { ...prev }
      STEP_FIELDS[step]?.forEach((field) => {
        delete updated[field]
      })
      if (Object.keys(errorsForStep).length === 0) {
        return updated
      }
      return { ...updated, ...errorsForStep }
    })
  }

  const validateStep = (step: number) => {
    const errors: Partial<Record<keyof OnboardingFormState, string>> = {}

    switch (step) {
      case 1: {
        if (!formData.companyName.trim()) errors.companyName = "Company name is required"
        if (!formData.registrationNumber.trim()) errors.registrationNumber = "Registration number is required"
        if (!formData.country.trim()) errors.country = "Select a country"
        if (!formData.city.trim()) errors.city = "City is required"
        if (!formData.address.trim()) errors.address = "Business address is required"
        if (!formData.phone.trim()) errors.phone = "Phone number is required"
        if (!formData.email.trim()) {
          errors.email = "Business email is required"
        } else if (!EMAIL_PATTERN.test(formData.email.trim())) {
          errors.email = "Enter a valid business email"
        }
        break
      }
      case 2: {
        if (!formData.fleetSize.trim()) errors.fleetSize = "Select your fleet size"
        if (formData.vehicleTypes.length === 0) errors.vehicleTypes = "Select at least one vehicle type"
        if (formData.operatingRegions.length === 0)
          errors.operatingRegions = "Select at least one operating region"
        if (formData.specializations.length === 0)
          errors.specializations = "Select at least one specialization"
        break
      }
      case 3: {
        if (!formData.adminFirstName.trim()) errors.adminFirstName = "First name is required"
        if (!formData.adminLastName.trim()) errors.adminLastName = "Last name is required"
        if (!formData.adminEmail.trim()) {
          errors.adminEmail = "Admin email is required"
        } else if (!EMAIL_PATTERN.test(formData.adminEmail.trim())) {
          errors.adminEmail = "Enter a valid email address"
        }
        if (!formData.adminPhone.trim()) errors.adminPhone = "Admin phone is required"
        if (!formData.adminPassword.trim()) {
          errors.adminPassword = "Password is required"
        } else if (formData.adminPassword.trim().length < 8) {
          errors.adminPassword = "Password must be at least 8 characters"
        }
        if (!formData.confirmPassword.trim()) {
          errors.confirmPassword = "Confirm your password"
        } else if (formData.confirmPassword !== formData.adminPassword) {
          errors.confirmPassword = "Passwords do not match"
        }
        break
      }
      default:
        break
    }

    applyStepErrors(step, errors)
    return Object.keys(errors).length === 0
  }

  const validateAllSteps = () => {
    let firstInvalidStep: number | null = null

    ;[1, 2, 3].forEach((step) => {
      const isValid = validateStep(step)
      if (!isValid && firstInvalidStep === null) {
        firstInvalidStep = step
      }
    })

    if (firstInvalidStep !== null) {
      setCurrentStep(firstInvalidStep)
      return false
    }

    return true
  }

  const updateField = <K extends keyof OnboardingFormState>(field: K, value: OnboardingFormState[K]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    setFieldErrors((prev) => {
      if (!(field in prev)) {
        return prev
      }
      const updated = { ...prev }
      delete updated[field]
      return updated
    })
  }

  const handleCheckboxChange = (field: ArrayField, value: string) => (event: ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target
    let nextValues: string[] = []

    setFormData((prev) => {
      const current = prev[field]
      nextValues = checked ? [...current, value] : current.filter((item) => item !== value)
      return {
        ...prev,
        [field]: nextValues,
      }
    })

    setFieldErrors((prev) => {
      const updated = { ...prev }
      if (nextValues.length > 0) {
        delete updated[field]
      } else {
        updated[field] = CHECKBOX_ERROR_MESSAGES[field]
      }
      return updated
    })
  }

  const handleNext = () => {
    if (currentStep < 4) {
      const isValid = validateStep(currentStep)
      if (!isValid) {
        return
      }
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const handleSubmit = () => {
    setSubmissionError(null)

    if (!validateAllSteps()) {
      return
    }

    const { taxNumber, website, ...rest } = formData

    const payload: RegisterCompanyApplicationInput = {
      ...rest,
      taxNumber: taxNumber.trim() ? taxNumber.trim() : null,
      website: website.trim() ? website.trim() : null,
    }

    startTransition(async () => {
      try {
        const result = await registerCompanyApplication(payload)
        if (!result.success) {
          setSubmissionError(result.error)
          return
        }
        router.push("/onboard/success")
      } catch (submissionError) {
        console.error("[onboard] submission failed", submissionError)
        setSubmissionError("Something went wrong while submitting your application. Please try again.")
      }
    })
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
                  onChange={(e) => updateField("companyName", e.target.value)}
                  aria-invalid={Boolean(fieldErrors.companyName)}
                />
                {fieldErrors.companyName && <p className="text-sm text-destructive">{fieldErrors.companyName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Registration Number *</Label>
                <Input
                  id="registrationNumber"
                  required
                  value={formData.registrationNumber}
                  onChange={(e) => updateField("registrationNumber", e.target.value)}
                  aria-invalid={Boolean(fieldErrors.registrationNumber)}
                />
                {fieldErrors.registrationNumber && (
                  <p className="text-sm text-destructive">{fieldErrors.registrationNumber}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxNumber">Tax Number</Label>
                <Input
                  id="taxNumber"
                  value={formData.taxNumber}
                  onChange={(e) => updateField("taxNumber", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) => updateField("country", value)}
                >
                  <SelectTrigger>
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
                {fieldErrors.country && <p className="text-sm text-destructive">{fieldErrors.country}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  required
                  value={formData.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  aria-invalid={Boolean(fieldErrors.city)}
                />
                {fieldErrors.city && <p className="text-sm text-destructive">{fieldErrors.city}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  required
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  aria-invalid={Boolean(fieldErrors.phone)}
                />
                {fieldErrors.phone && <p className="text-sm text-destructive">{fieldErrors.phone}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Business Address *</Label>
              <Textarea
                id="address"
                required
                value={formData.address}
                onChange={(e) => updateField("address", e.target.value)}
                aria-invalid={Boolean(fieldErrors.address)}
              />
              {fieldErrors.address && <p className="text-sm text-destructive">{fieldErrors.address}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Business Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  aria-invalid={Boolean(fieldErrors.email)}
                />
                {fieldErrors.email && <p className="text-sm text-destructive">{fieldErrors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => updateField("website", e.target.value)}
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
                onValueChange={(value) => updateField("fleetSize", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fleet size" />
                </SelectTrigger>
                <SelectContent>
                  {FLEET_SIZE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option} vehicles
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.fleetSize && <p className="text-sm text-destructive">{fieldErrors.fleetSize}</p>}
            </div>
            <div className="space-y-2">
              <Label>Vehicle Types (Select all that apply)</Label>
              <div className="grid grid-cols-2 gap-2">
                {VEHICLE_TYPES.map((type) => (
                  <label key={type} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.vehicleTypes.includes(type)}
                      onChange={handleCheckboxChange("vehicleTypes", type)}
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
              {fieldErrors.vehicleTypes && <p className="text-sm text-destructive">{fieldErrors.vehicleTypes}</p>}
            </div>
            <div className="space-y-2">
              <Label>Operating Regions (Select all that apply)</Label>
              <div className="grid grid-cols-2 gap-2">
                {OPERATING_REGION_OPTIONS.map((region) => (
                  <label key={region} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.operatingRegions.includes(region)}
                      onChange={handleCheckboxChange("operatingRegions", region)}
                    />
                    <span>{region}</span>
                  </label>
                ))}
              </div>
              {fieldErrors.operatingRegions && (
                <p className="text-sm text-destructive">{fieldErrors.operatingRegions}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Specializations (Select all that apply)</Label>
              <div className="grid grid-cols-2 gap-2">
                {SPECIALIZATION_OPTIONS.map((spec) => (
                  <label key={spec} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.specializations.includes(spec)}
                      onChange={handleCheckboxChange("specializations", spec)}
                    />
                    <span>{spec}</span>
                  </label>
                ))}
              </div>
              {fieldErrors.specializations && (
                <p className="text-sm text-destructive">{fieldErrors.specializations}</p>
              )}
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
                  onChange={(e) => updateField("adminFirstName", e.target.value)}
                  aria-invalid={Boolean(fieldErrors.adminFirstName)}
                />
                {fieldErrors.adminFirstName && (
                  <p className="text-sm text-destructive">{fieldErrors.adminFirstName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminLastName">Last Name *</Label>
                <Input
                  id="adminLastName"
                  required
                  value={formData.adminLastName}
                  onChange={(e) => updateField("adminLastName", e.target.value)}
                  aria-invalid={Boolean(fieldErrors.adminLastName)}
                />
                {fieldErrors.adminLastName && <p className="text-sm text-destructive">{fieldErrors.adminLastName}</p>}
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
                  onChange={(e) => updateField("adminEmail", e.target.value)}
                  aria-invalid={Boolean(fieldErrors.adminEmail)}
                />
                {fieldErrors.adminEmail && <p className="text-sm text-destructive">{fieldErrors.adminEmail}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminPhone">Phone Number *</Label>
                <Input
                  id="adminPhone"
                  required
                  value={formData.adminPhone}
                  onChange={(e) => updateField("adminPhone", e.target.value)}
                  aria-invalid={Boolean(fieldErrors.adminPhone)}
                />
                {fieldErrors.adminPhone && <p className="text-sm text-destructive">{fieldErrors.adminPhone}</p>}
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
                  onChange={(e) => updateField("adminPassword", e.target.value)}
                  aria-invalid={Boolean(fieldErrors.adminPassword)}
                />
                {fieldErrors.adminPassword && (
                  <p className="text-sm text-destructive">{fieldErrors.adminPassword}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-sm text-destructive">{fieldErrors.confirmPassword}</p>
                )}
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
                After submission, your application will be reviewed by our team. You&apos;ll receive an email confirmation
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

            {submissionError && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{submissionError}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 1}>
                Previous
              </Button>

              {currentStep < 4 ? (
                <Button onClick={handleNext} disabled={isPending}>
                  Next
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isPending}>
                  {isPending ? "Submitting..." : "Submit Application"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
