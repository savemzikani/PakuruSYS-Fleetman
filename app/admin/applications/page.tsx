"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Search, Filter, Eye, Check, X, Clock, Building2, MapPin, Phone, Mail, FileText } from "lucide-react"

const applications = [
  {
    id: 1,
    companyName: "Trans Africa Logistics",
    contactPerson: "John Mthembu",
    email: "john@transafrica.co.za",
    phone: "+27 11 123 4567",
    country: "South Africa",
    city: "Johannesburg",
    fleetSize: 25,
    businessType: "Cross-border freight",
    registrationNumber: "2023/123456/07",
    taxNumber: "9876543210",
    status: "pending",
    submittedAt: "2024-01-15T10:30:00Z",
    documents: ["Business Registration", "Tax Certificate", "Transport License"],
  },
  {
    id: 2,
    companyName: "Desert Express Transport",
    contactPerson: "Maria Santos",
    email: "maria@desertexpress.na",
    phone: "+264 61 234 567",
    country: "Namibia",
    city: "Windhoek",
    fleetSize: 15,
    businessType: "Regional distribution",
    registrationNumber: "CC/2023/1234",
    taxNumber: "1234567890",
    status: "under_review",
    submittedAt: "2024-01-14T14:20:00Z",
    documents: ["Business Registration", "Tax Certificate", "Insurance Certificate"],
  },
  {
    id: 3,
    companyName: "Kalahari Freight Solutions",
    contactPerson: "David Mogale",
    email: "david@kalahari.bw",
    phone: "+267 71 345 678",
    country: "Botswana",
    city: "Gaborone",
    fleetSize: 8,
    businessType: "Local delivery",
    registrationNumber: "BW00001234567",
    taxNumber: "P00123456789",
    status: "approved",
    submittedAt: "2024-01-10T09:15:00Z",
    documents: ["Business Registration", "Tax Certificate", "Transport License", "Insurance Certificate"],
  },
]

export default function ApplicationsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedApplication, setSelectedApplication] = useState<(typeof applications)[0] | null>(null)

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || app.status === statusFilter
    return matchesSearch && matchesStatus
  })

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

  const handleApprove = (id: number) => {
    console.log("[v0] Approving application:", id)
    // Implementation for approval
  }

  const handleReject = (id: number) => {
    console.log("[v0] Rejecting application:", id)
    // Implementation for rejection
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Company Applications</h1>
        <p className="text-muted-foreground">Review and manage company registration requests</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search applications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredApplications.map((application) => (
          <Card key={application.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {application.companyName}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {application.city}, {application.country}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(application.submittedAt).toLocaleDateString()}
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
                    <span className="text-sm">Fleet Size: {application.fleetSize} vehicles</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm">
                    <strong>Contact:</strong> {application.contactPerson}
                  </p>
                  <p className="text-sm">
                    <strong>Business Type:</strong> {application.businessType}
                  </p>
                  <p className="text-sm">
                    <strong>Registration:</strong> {application.registrationNumber}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setSelectedApplication(application)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{selectedApplication?.companyName}</DialogTitle>
                      <DialogDescription>Complete application details and documents</DialogDescription>
                    </DialogHeader>
                    {selectedApplication && (
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <Label>Contact Person</Label>
                            <p className="text-sm text-muted-foreground">{selectedApplication.contactPerson}</p>
                          </div>
                          <div>
                            <Label>Email</Label>
                            <p className="text-sm text-muted-foreground">{selectedApplication.email}</p>
                          </div>
                          <div>
                            <Label>Phone</Label>
                            <p className="text-sm text-muted-foreground">{selectedApplication.phone}</p>
                          </div>
                          <div>
                            <Label>Location</Label>
                            <p className="text-sm text-muted-foreground">
                              {selectedApplication.city}, {selectedApplication.country}
                            </p>
                          </div>
                          <div>
                            <Label>Registration Number</Label>
                            <p className="text-sm text-muted-foreground">{selectedApplication.registrationNumber}</p>
                          </div>
                          <div>
                            <Label>Tax Number</Label>
                            <p className="text-sm text-muted-foreground">{selectedApplication.taxNumber}</p>
                          </div>
                        </div>
                        <div>
                          <Label>Documents Submitted</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedApplication.documents.map((doc, i) => (
                              <Badge key={i} variant="outline">
                                {doc}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label>Review Notes</Label>
                          <Textarea placeholder="Add review notes..." className="mt-2" />
                        </div>
                      </div>
                    )}
                    <DialogFooter>
                      <Button variant="outline" onClick={() => handleReject(selectedApplication?.id || 0)}>
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button onClick={() => handleApprove(selectedApplication?.id || 0)}>
                        <Check className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {application.status === "pending" && (
                  <>
                    <Button size="sm" onClick={() => handleApprove(application.id)}>
                      <Check className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleReject(application.id)}>
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
