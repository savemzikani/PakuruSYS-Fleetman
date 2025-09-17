"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle, XCircle, Eye } from "lucide-react"
import { approveFleetApplication, rejectFleetApplication } from "@/lib/actions/super-admin"
import { toast } from "sonner"

interface ApplicationActionsProps {
  application: {
    id: string
    company_name: string
    contact_person: string
    email: string
    phone: string
    country: string
    city: string
    address: string
    status: string
  }
}

export function ApplicationActions({ application }: ApplicationActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const handleApprove = async () => {
    setIsLoading(true)
    try {
      const result = await approveFleetApplication(application.id, {
        name: application.company_name,
        country: application.country,
        city: application.city,
        address: application.address,
        email: application.email,
        phone: application.phone,
      })
      
      if (result.success) {
        toast.success("Application approved and company created successfully")
        setShowApproveDialog(false)
      } else {
        toast.error(result.error || "Failed to approve application")
      }
    } catch (error) {
      toast.error("Failed to approve application")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection")
      return
    }

    setIsLoading(true)
    try {
      const result = await rejectFleetApplication(application.id, rejectReason)
      
      if (result.success) {
        toast.success("Application rejected successfully")
        setShowRejectDialog(false)
        setRejectReason("")
      } else {
        toast.error(result.error || "Failed to reject application")
      }
    } catch (error) {
      toast.error("Failed to reject application")
    } finally {
      setIsLoading(false)
    }
  }

  if (application.status !== "pending") {
    return (
      <div className="flex items-center gap-2">
        <Badge variant={application.status === "approved" ? "default" : "destructive"}>
          {application.status}
        </Badge>
        <Button variant="outline" size="sm" onClick={() => setShowDetailsDialog(true)}>
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDetailsDialog(true)}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() => setShowApproveDialog(true)}
          disabled={isLoading}
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Approve
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowRejectDialog(true)}
          disabled={isLoading}
        >
          <XCircle className="h-4 w-4 mr-1" />
          Reject
        </Button>
      </div>

      {/* Application Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              Fleet owner application from {application.company_name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Company Name</Label>
                <div className="font-medium">{application.company_name}</div>
              </div>
              <div>
                <Label>Contact Person</Label>
                <div className="font-medium">{application.contact_person}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <div className="font-medium">{application.email}</div>
              </div>
              <div>
                <Label>Phone</Label>
                <div className="font-medium">{application.phone}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Country</Label>
                <div className="font-medium">{application.country}</div>
              </div>
              <div>
                <Label>City</Label>
                <div className="font-medium">{application.city}</div>
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <div className="font-medium">{application.address}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Application</DialogTitle>
            <DialogDescription>
              This will create a new company "{application.company_name}" and approve the application.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={isLoading}>
              {isLoading ? "Approving..." : "Approve & Create Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this application.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea
                id="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject} 
              disabled={isLoading || !rejectReason.trim()}
            >
              {isLoading ? "Rejecting..." : "Reject Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
