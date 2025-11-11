"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { formatDistanceToNow } from "date-fns"

import { updateTeamMember } from "@/app/settings/actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

const EDITABLE_ROLES = ["company_admin", "manager", "dispatcher", "driver"] as const

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  company_admin: "Admin",
  manager: "Manager",
  dispatcher: "Dispatcher",
  driver: "Driver",
  customer: "Customer",
}

type EditableRole = (typeof EDITABLE_ROLES)[number]

type TeamMember = {
  id: string
  name: string
  email: string | null
  role: string
  isActive: boolean
  lastLoginAt: string | null
}

interface TeamMembersTableProps {
  members: TeamMember[]
  canEdit: boolean
  currentUserId: string
}

function formatLastSeen(lastLoginAt: string | null): string {
  if (!lastLoginAt) {
    return "Never"
  }

  const date = new Date(lastLoginAt)
  if (Number.isNaN(date.getTime())) {
    return "Unknown"
  }

  return formatDistanceToNow(date, { addSuffix: true })
}

export function TeamMembersTable({ members, canEdit, currentUserId }: TeamMembersTableProps) {
  const [optimisticMembers, setOptimisticMembers] = useState<TeamMember[]>(members)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setOptimisticMembers(members)
  }, [members])

  useEffect(() => {
    if (!successMessage) return

    const timer = window.setTimeout(() => {
      setSuccessMessage(null)
    }, 3500)

    return () => window.clearTimeout(timer)
  }, [successMessage])

  const editableMembers = useMemo(() => {
    return new Set<string>(EDITABLE_ROLES as unknown as string[])
  }, [])

  const handleUpdate = (memberId: string, nextRole: string, nextActive: boolean) => {
    const previousMembers = optimisticMembers
    const targetMember = optimisticMembers.find((member) => member.id === memberId)

    if (!targetMember) {
      return
    }

    setOptimisticMembers((prev) =>
      prev.map((member) =>
        member.id === memberId
          ? {
              ...member,
              role: nextRole,
              isActive: nextActive,
            }
          : member,
      ),
    )

    setError(null)
    startTransition(async () => {
      setPendingMemberId(memberId)
      const result = await updateTeamMember({ memberId, role: nextRole as EditableRole, isActive: nextActive })

      if (!result.success) {
        setOptimisticMembers(previousMembers)
        setError(result.error)
      } else {
        setSuccessMessage("Team member updated successfully.")
      }

      setPendingMemberId(null)
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && !error && (
        <Alert variant="default">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <div className="overflow-hidden rounded-md border">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="w-1/4 px-4 py-3 font-medium">Name</th>
              <th className="w-1/4 px-4 py-3 font-medium">Email</th>
              <th className="w-1/6 px-4 py-3 font-medium">Role</th>
              <th className="w-1/6 px-4 py-3 font-medium">Status</th>
              <th className="w-1/6 px-4 py-3 font-medium">Last active</th>
            </tr>
          </thead>
          <tbody>
            {optimisticMembers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No team members found for this company.
                </td>
              </tr>
            ) : (
              optimisticMembers.map((member) => {
                const isSuperAdmin = member.role === "super_admin"
                const isCustomer = member.role === "customer"
                const isEditable = editableMembers.has(member.role)
                const isSelf = member.id === currentUserId
                const controlsDisabled =
                  !canEdit || isSuperAdmin || isCustomer || isPending || pendingMemberId === member.id

                return (
                  <tr key={member.id} className="border-t text-sm">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{member.name}</span>
                        <span className="text-xs text-muted-foreground">{member.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {member.email ?? <span className="italic">No email</span>}
                    </td>
                    <td className="px-4 py-3">
                      {isEditable && canEdit ? (
                        <Select
                          disabled={controlsDisabled}
                          value={member.role}
                          onValueChange={(value) => handleUpdate(member.id, value, member.isActive)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EDITABLE_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {ROLE_LABELS[role] ?? role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary">{ROLE_LABELS[member.role] ?? member.role}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={member.isActive}
                          disabled={controlsDisabled || isSelf}
                          onCheckedChange={(checked) => handleUpdate(member.id, member.role, checked)}
                        />
                        <span className="text-sm text-muted-foreground">{member.isActive ? "Active" : "Inactive"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatLastSeen(member.lastLoginAt)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
