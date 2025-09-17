"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MoreHorizontal, Edit, Trash2, UserPlus } from "lucide-react"
import { updateCompanyStatus, deleteCompany } from "@/lib/actions/super-admin"
import { toast } from "sonner"

interface CompanyActionsProps {
  company: {
    id: string
    name: string
    status: string
  }
}

export function CompanyActions({ company }: CompanyActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleStatusChange = async (newStatus: "active" | "inactive" | "suspended") => {
    setIsLoading(true)
    try {
      const result = await updateCompanyStatus(company.id, newStatus)
      if (result.success) {
        toast.success(`Company status updated to ${newStatus}`)
      } else {
        toast.error(result.error || "Failed to update status")
      }
    } catch (error) {
      toast.error("Failed to update company status")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      const result = await deleteCompany(company.id)
      if (result.success) {
        toast.success("Company deleted successfully")
        setShowDeleteDialog(false)
      } else {
        toast.error(result.error || "Failed to delete company")
      }
    } catch (error) {
      toast.error("Failed to delete company")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isLoading}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleStatusChange("active")}>
            Set Active
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange("inactive")}>
            Set Inactive
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange("suspended")}>
            Suspend
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Company
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{company.name}"? This action cannot be undone.
              The company must have no active users or loads to be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
