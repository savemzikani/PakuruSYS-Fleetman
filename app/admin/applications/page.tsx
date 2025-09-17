import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ApplicationActions } from "@/components/admin/application-actions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Eye, Clock, Building2, MapPin, Phone, Mail, FileText } from "lucide-react"

export default async function ApplicationsPage() {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .single()

  if (!profile || profile.role !== "super_admin") {
    redirect("/dashboard")
  }

  // Fetch fleet applications from database
  const { data: applications } = await supabase
    .from("fleet_applications")
    .select("*")
    .order("created_at", { ascending: false })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary"
      case "under_review":
        return "outline"
      case "approved":
        return "default"
      case "rejected":
        return "destructive"
      default:
        return "secondary"
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Company Applications</h1>
        <p className="text-muted-foreground">Review and manage company registration requests</p>
      </div>

      <div className="grid gap-4">
        {applications && applications.length > 0 ? applications.map((application) => (
          <Card key={application.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {application.company_name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {application.city}, {application.country}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(application.created_at).toLocaleDateString()}
                    </span>
                  </CardDescription>
                </div>
                <Badge variant={getStatusColor(application.status)}>{application.status.replace("_", " ")}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{application.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{application.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Fleet Size: {application.fleet_size || 'N/A'} vehicles</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm">
                    <strong>Contact:</strong> {application.contact_person}
                  </p>
                  <p className="text-sm">
                    <strong>Business Type:</strong> {application.business_type || 'N/A'}
                  </p>
                  <p className="text-sm">
                    <strong>Registration:</strong> {application.registration_number || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <ApplicationActions application={application} />
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{application.company_name}</DialogTitle>
                      <DialogDescription>Complete application details</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label>Contact Person</Label>
                          <p className="text-sm text-muted-foreground">{application.contact_person}</p>
                        </div>
                        <div>
                          <Label>Email</Label>
                          <p className="text-sm text-muted-foreground">{application.email}</p>
                        </div>
                        <div>
                          <Label>Phone</Label>
                          <p className="text-sm text-muted-foreground">{application.phone}</p>
                        </div>
                        <div>
                          <Label>Location</Label>
                          <p className="text-sm text-muted-foreground">
                            {application.city}, {application.country}
                          </p>
                        </div>
                        <div>
                          <Label>Registration Number</Label>
                          <p className="text-sm text-muted-foreground">{application.registration_number || 'N/A'}</p>
                        </div>
                        <div>
                          <Label>Tax Number</Label>
                          <p className="text-sm text-muted-foreground">{application.tax_number || 'N/A'}</p>
                        </div>
                        <div>
                          <Label>Fleet Size</Label>
                          <p className="text-sm text-muted-foreground">{application.fleet_size || 'N/A'} vehicles</p>
                        </div>
                        <div>
                          <Label>Business Type</Label>
                          <p className="text-sm text-muted-foreground">{application.business_type || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline">
                        Close
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        )) : (
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No applications found</h3>
            <p className="text-muted-foreground">Fleet applications will appear here once submitted.</p>
          </div>
        )}
      </div>
    </div>
  )
}
