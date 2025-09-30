import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Truck, Upload, FileText, Building2 } from "lucide-react"
import Link from "next/link"

export default async function RegisterCompanyPage() {
  const supabase = await createClient()

  // Check if user is already authenticated - redirect to dashboard if they are
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard")
  }

  const sadcCountries = [
    "Angola", "Botswana", "Comoros", "Democratic Republic of the Congo", "Eswatini",
    "Lesotho", "Madagascar", "Malawi", "Mauritius", "Mozambique", "Namibia",
    "Seychelles", "South Africa", "Tanzania", "Zambia", "Zimbabwe"
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Truck className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-lg font-bold">PakuruSYS Fleetman</h1>
              <p className="text-xs text-muted-foreground">SADC Transport Management</p>
            </div>
          </div>
          <Link href="/auth/login">
            <Button variant="outline">Sign In</Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-12">
        <div className="mx-auto max-w-4xl">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Join the SADC Transport Network
            </h1>
            <p className="text-xl text-muted-foreground mb-6">
              Register your trucking company and start managing your fleet with our comprehensive platform
            </p>
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span>500+ Companies</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                <span>10,000+ Vehicles</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span>Cross-border Compliance</span>
              </div>
            </div>
          </div>

          {/* Registration Form */}
          <Card className="mx-auto max-w-2xl">
            <CardHeader>
              <CardTitle className="text-2xl">Company Registration</CardTitle>
              <p className="text-muted-foreground">
                Fill out the form below to apply for access to our platform. Our team will review your application.
              </p>
            </CardHeader>
            <CardContent>
              <form className="space-y-6">
                {/* Company Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Company Information</h3>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="company_name">Company Name *</Label>
                      <Input 
                        id="company_name" 
                        name="company_name" 
                        placeholder="ABC Transport Ltd" 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="registration_number">Registration Number *</Label>
                      <Input 
                        id="registration_number" 
                        name="registration_number" 
                        placeholder="2023/123456/07" 
                        required 
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="vat_number">VAT Number</Label>
                      <Input 
                        id="vat_number" 
                        name="vat_number" 
                        placeholder="4567890123" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country *</Label>
                      <Select name="country" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {sadcCountries.map((country) => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Physical Address *</Label>
                    <Textarea 
                      id="address" 
                      name="address" 
                      placeholder="123 Main Street, Industrial Area, City" 
                      required 
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Primary Contact</h3>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="contact_first_name">First Name *</Label>
                      <Input 
                        id="contact_first_name" 
                        name="contact_first_name" 
                        placeholder="John" 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_last_name">Last Name *</Label>
                      <Input 
                        id="contact_last_name" 
                        name="contact_last_name" 
                        placeholder="Smith" 
                        required 
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="contact_email">Email Address *</Label>
                      <Input 
                        id="contact_email" 
                        name="contact_email" 
                        type="email" 
                        placeholder="john@abctransport.com" 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_phone">Phone Number *</Label>
                      <Input 
                        id="contact_phone" 
                        name="contact_phone" 
                        placeholder="+27 11 123 4567" 
                        required 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position">Position/Title *</Label>
                    <Input 
                      id="position" 
                      name="position" 
                      placeholder="Fleet Manager" 
                      required 
                    />
                  </div>
                </div>

                {/* Fleet Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Fleet Information</h3>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="vehicle_count">Number of Vehicles *</Label>
                      <Select name="vehicle_count" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select range" />
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
                      <Label htmlFor="vehicle_types">Primary Vehicle Types</Label>
                      <Select name="vehicle_types">
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trucks">Heavy Trucks</SelectItem>
                          <SelectItem value="trailers">Truck & Trailers</SelectItem>
                          <SelectItem value="tankers">Tankers</SelectItem>
                          <SelectItem value="refrigerated">Refrigerated</SelectItem>
                          <SelectItem value="mixed">Mixed Fleet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="operating_routes">Primary Operating Routes *</Label>
                    <Textarea 
                      id="operating_routes" 
                      name="operating_routes" 
                      placeholder="E.g., South Africa to Zimbabwe, Botswana domestic routes, Cross-border SADC" 
                      required 
                    />
                  </div>
                </div>

                {/* Document Upload */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Required Documents</h3>
                  <p className="text-sm text-muted-foreground">
                    Please upload the following documents. Supported formats: PDF, JPG, PNG (Max 5MB each)
                  </p>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="business_registration">Business Registration Certificate *</Label>
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                        <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                        <input type="file" id="business_registration" className="hidden" accept=".pdf,.jpg,.png" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="operating_license">Transport Operating License *</Label>
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                        <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                        <input type="file" id="operating_license" className="hidden" accept=".pdf,.jpg,.png" />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="insurance_certificate">Insurance Certificate *</Label>
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                        <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                        <input type="file" id="insurance_certificate" className="hidden" accept=".pdf,.jpg,.png" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bank_details">Banking Details (Optional)</Label>
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                        <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                        <input type="file" id="bank_details" className="hidden" accept=".pdf,.jpg,.png" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subscription Plan */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Subscription Plan</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className="relative">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg">Starter</CardTitle>
                        <div className="text-2xl font-bold">$99<span className="text-sm font-normal">/month</span></div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div>• Up to 10 vehicles</div>
                        <div>• Basic load management</div>
                        <div>• Customer portal</div>
                        <div>• Email support</div>
                      </CardContent>
                      <div className="absolute top-2 right-2">
                        <input type="radio" name="plan" value="starter" className="h-4 w-4" />
                      </div>
                    </Card>

                    <Card className="relative border-primary">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg">Professional</CardTitle>
                        <div className="text-2xl font-bold">$299<span className="text-sm font-normal">/month</span></div>
                        <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">POPULAR</div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div>• Up to 50 vehicles</div>
                        <div>• Advanced analytics</div>
                        <div>• Real-time tracking</div>
                        <div>• Priority support</div>
                      </CardContent>
                      <div className="absolute top-2 right-2">
                        <input type="radio" name="plan" value="professional" className="h-4 w-4" defaultChecked />
                      </div>
                    </Card>

                    <Card className="relative">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg">Enterprise</CardTitle>
                        <div className="text-2xl font-bold">Custom</div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div>• Unlimited vehicles</div>
                        <div>• API access</div>
                        <div>• Custom integrations</div>
                        <div>• 24/7 support</div>
                      </CardContent>
                      <div className="absolute top-2 right-2">
                        <input type="radio" name="plan" value="enterprise" className="h-4 w-4" />
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Submit */}
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">What happens next?</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• We'll review your application within 2-3 business days</li>
                      <li>• Our team will verify your documents and business credentials</li>
                      <li>• You'll receive an email with your account setup instructions</li>
                      <li>• Start with a 30-day free trial of your selected plan</li>
                    </ul>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="terms" required className="h-4 w-4" />
                    <Label htmlFor="terms" className="text-sm">
                      I agree to the{" "}
                      <Link href="/terms" className="text-primary underline">Terms of Service</Link>
                      {" "}and{" "}
                      <Link href="/privacy" className="text-primary underline">Privacy Policy</Link>
                    </Label>
                  </div>

                  <Button type="submit" size="lg" className="w-full">
                    Submit Application
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/50 mt-24">
        <div className="container px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>&copy; 2024 PakuruSYS Fleetman. All rights reserved.</p>
            <p className="mt-2">Supporting SADC transport and logistics since 2024</p>
          </div>
        </div>
      </footer>
    </div>
  )
}