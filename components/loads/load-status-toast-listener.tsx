"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

interface LoadStatusToastListenerProps {
  companyId?: string | null
}

interface LoadRow {
  id: string
  load_number?: string | null
  status?: string | null
  updated_at?: string | null
  company_id?: string | null
}

const STATUS_VARIANTS: Record<string, "success" | "error" | "info" | "warning"> = {
  pending: "warning",
  assigned: "info",
  in_transit: "info",
  delivered: "success",
  cancelled: "error",
}

const formatStatusLabel = (status: string) =>
  status
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")

export function LoadStatusToastListener({ companyId }: LoadStatusToastListenerProps) {
  useEffect(() => {
    if (!companyId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`company-${companyId}-load-status`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "loads",
          filter: `company_id=eq.${companyId}`,
        },
        (payload: RealtimePostgresChangesPayload<LoadRow>) => {
          const newRow = (payload.new as LoadRow) ?? null
          const oldRow = (payload.old as LoadRow) ?? null

          if (!newRow || !newRow.status || oldRow?.status === newRow.status) {
            return
          }

          const loadNumber = newRow.load_number || newRow.id
          const status = newRow.status
          const formattedStatus = formatStatusLabel(status)
          const updatedAt = newRow.updated_at ? new Date(newRow.updated_at) : null
          const variant = STATUS_VARIANTS[status] ?? "info"

          const description = updatedAt
            ? `Updated ${updatedAt.toLocaleString()}`
            : "Status update received"

          switch (variant) {
            case "success":
              toast.success(`Load ${loadNumber} delivered`, {
                description,
              })
              break
            case "error":
              toast.error(`Load ${loadNumber} ${formattedStatus.toLowerCase()}`, {
                description,
              })
              break
            case "warning":
              toast.warning(`Load ${loadNumber} marked as ${formattedStatus}`, {
                description,
              })
              break
            default:
              toast(`Load ${loadNumber}`, {
                description: `Status changed to ${formattedStatus}. ${description}`,
              })
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [companyId])

  return null
}
