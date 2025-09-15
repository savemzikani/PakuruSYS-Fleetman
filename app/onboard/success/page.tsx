import { CheckCircle, Mail, Clock, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function OnboardSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Application Submitted Successfully!</CardTitle>
            <CardDescription className="text-gray-600">
              Thank you for applying to join the SADC Logistics Network
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900">Check Your Email</h3>
                  <p className="text-blue-700 text-sm">
                    We've sent a confirmation email with your application details and next steps.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900">Review Process</h3>
                  <p className="text-yellow-700 text-sm">
                    Our team will review your application within 2-3 business days. You'll receive updates via email.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <ArrowRight className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900">What's Next?</h3>
                  <ul className="text-green-700 text-sm space-y-1">
                    <li>• Application review by our team</li>
                    <li>• Account activation upon approval</li>
                    <li>• Welcome email with login instructions</li>
                    <li>• Onboarding call to set up your fleet</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="text-center space-y-4">
              <p className="text-gray-600">Have questions about your application?</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" asChild>
                  <Link href="mailto:support@sadclogistics.com">Contact Support</Link>
                </Button>
                <Button asChild>
                  <Link href="/">Return to Homepage</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
