"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckCircle2, Mail, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { PaymentStatus } from "@/lib/types/database"
import { markInvoiceAsPaid, sendInvoiceReminder } from "@/app/financial/invoices/actions"

interface InvoiceActionsProps {
  invoiceId: string
  status: PaymentStatus
  isOverdue?: boolean
}

export function InvoiceActions({ invoiceId, status, isOverdue }: InvoiceActionsProps) {
  const router = useRouter()
  const [pendingAction, setPendingAction] = useState<"mark" | "reminder" | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleMarkAsPaid = () => {
    if (status === "paid") {
      toast.info("Invoice is already marked as paid.")
      return
    }

    const confirmMark = window.confirm("Mark this invoice as paid?")
    if (!confirmMark) return

    setPendingAction("mark")
    startTransition(() => {
      markInvoiceAsPaid(invoiceId)
        .then((result) => {
          if (result.success) {
            toast.success("Invoice marked as paid.")
            router.refresh()
          } else {
            toast.error(result.error ?? "Failed to update invoice.")
          }
        })
        .catch(() => {
          toast.error("Something went wrong while updating the invoice.")
        })
        .finally(() => {
          setPendingAction(null)
        })
    })
  }

  const handleSendReminder = () => {
    if (status === "paid" || status === "cancelled") {
      toast.info("Reminders are only available for pending or overdue invoices.")
      return
    }

    setPendingAction("reminder")
    startTransition(() => {
      sendInvoiceReminder(invoiceId)
        .then((result) => {
          if (result.success) {
            const context = isOverdue ? "overdue" : "pending"
            toast.success(`Reminder sent for ${context} invoice.`)
            router.refresh()
          } else {
            toast.error(result.error ?? "Failed to send reminder.")
          }
        })
        .catch(() => {
          toast.error("Something went wrong while sending the reminder.")
        })
        .finally(() => {
          setPendingAction(null)
        })
    })
  }

  const markDisabled = status === "paid" || status === "cancelled" || (isPending && pendingAction === "mark")
  const reminderDisabled = status === "paid" || status === "cancelled" || (isPending && pendingAction === "reminder")

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={handleMarkAsPaid} disabled={markDisabled}>
        {isPending && pendingAction === "mark" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        <span className="ml-2">Mark as Paid</span>
      </Button>
      <Button variant="outline" size="sm" onClick={handleSendReminder} disabled={reminderDisabled}>
        {isPending && pendingAction === "reminder" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Mail className="h-4 w-4" />
        )}
        <span className="ml-2">Send Reminder</span>
      </Button>
    </div>
  )
}
