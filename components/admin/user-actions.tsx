"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
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
import { Edit, Trash2, MoreHorizontal, Shield, CheckCircle2, Ban } from "lucide-react"
import { updateUserRole, deleteUser, setUserActive } from "@/lib/actions/super-admin"
import { toast } from "sonner"

interface UserActionsProps {
  user: {
    id: string
    first_name: string
    last_name: string
    role: string
    email: string
    is_active?: boolean
  }
}

export function UserActions({ user }: UserActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleRoleChange = async (newRole: string) => {
    setIsLoading(true)
    try {
      const result = await updateUserRole(user.id, newRole)
      if (result.success) {
        toast.success(`User role updated to ${newRole.replace('_', ' ')}`)
      } else {
        toast.error(result.error || "Failed to update role")
      }
    } catch (error) {
      toast.error("Failed to update user role")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      const result = await deleteUser(user.id)
      if (result.success) {
        toast.success("User deleted successfully")
        setShowDeleteDialog(false)
      } else {
        toast.error(result.error || "Failed to delete user")
      }
    } catch (error) {
      toast.error("Failed to delete user")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetActive = async (active: boolean) => {
    setIsLoading(true)
    try {
      const result = await setUserActive(user.id, active)
      if (result.success) {
        toast.success(active ? "User approved and activated" : "User deactivated")
      } else {
        toast.error(result.error || "Failed to update user status")
      }
    } catch (error) {
      toast.error("Failed to update user status")
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
          {user.is_active === false && (
            <DropdownMenuItem onClick={() => handleSetActive(true)}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve & Activate
            </DropdownMenuItem>
          )}
          {user.is_active !== false && (
            <DropdownMenuItem onClick={() => handleSetActive(false)}>
              <Ban className="h-4 w-4 mr-2" />
              Deactivate
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => handleRoleChange("company_admin")}>
            <Shield className="h-4 w-4 mr-2" />
            Make Company Admin
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleRoleChange("manager")}>
            Make Manager
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleRoleChange("dispatcher")}>
            Make Dispatcher
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleRoleChange("driver")}>
            Make Driver
          </DropdownMenuItem>
          {user.role !== "super_admin" && (
            <DropdownMenuItem 
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete User
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{user.first_name} {user.last_name}" ({user.email})? 
              This action cannot be undone and will remove all user data.
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
