"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { Loader2, Mail, Copy } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { QuoteStatus } from "@/lib/types/database"
import { createClient } from "@/lib/supabase/client"

interface QuoteSendDialogProps {
  quoteId: string
  quoteNumber: string
  status: QuoteStatus
  totalAmount: number
  currency: string
  customerName?: string | null
  customerEmail?: string | null
  deliveryEmail?: string | null
  companyName?: string | null
  basePath: string
  initialOpen?: boolean
}

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(amount)

export function QuoteSendDialog({
  quoteId,
  quoteNumber,
  status,
  totalAmount,
  currency,
  customerName,
  customerEmail,
  deliveryEmail,
  companyName,
  basePath,
  initialOpen = false,
}: QuoteSendDialogProps) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [open, setOpen] = useState(initialOpen)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setOpen(initialOpen)
  }, [initialOpen])

  const recipientEmails = [customerEmail, deliveryEmail]
    .map((value) => value?.trim())
    .filter((value, index, self) => value && self.indexOf(value) === index)
    .join(", ")

  const subject = `${companyName ? `${companyName} – ` : ""}Quote ${quoteNumber}`

  const formattedTotal = formatCurrency(totalAmount ?? 0, currency)

  const body = `Hi ${customerName ?? "there"},\n\nPlease find attached Quote ${quoteNumber} totaling ${formattedTotal}.\n\nLet me know if you have any questions or would like to approve this quote.\n\nBest regards,\n${companyName ?? "Your logistics team"}`

  const closeDialog = () => {
    setOpen(false)
    router.replace(basePath, { scroll: false })
  }

  const handleSent = () => {
    startTransition(async () => {
      const { error } = await supabase
        .from("quotes")
        .update({ status: "sent" })
        .eq("id", quoteId)

      if (error) {
        console.error("Failed to mark quote as sent", error)
        toast.error("Unable to mark quote as sent. Please try again.")
        return
      }

      toast.success("Quote marked as sent")
      closeDialog()
      router.refresh()
    })
  }

  const handleCopy = async (content: string, label: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      toast.error("Clipboard not available in this environment")
      return
    }

    try {
      await navigator.clipboard.writeText(content)
      toast.success(`${label} copied to clipboard`)
    } catch (error) {
      console.error("Failed to copy text", error)
      toast.error("Failed to copy. Please try again.")
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      router.replace(basePath, { scroll: false })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Quote {quoteNumber}</DialogTitle>
          <DialogDescription>
            Generate an email to your customer and mark the quote as sent once the message has been delivered.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" /> Email recipients
            </Label>
            <Textarea value={recipientEmails || "No email on file"} readOnly rows={2} className="bg-muted" />
            {recipientEmails && (
              <Button variant="outline" size="sm" onClick={() => handleCopy(recipientEmails, "Recipients")}>
                <Copy className="mr-2 h-4 w-4" /> Copy recipients
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label>Email subject</Label>
            <Textarea value={subject} readOnly rows={2} className="bg-muted" />
            <Button variant="outline" size="sm" onClick={() => handleCopy(subject, "Subject")}>
              <Copy className="mr-2 h-4 w-4" /> Copy subject
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Email body</Label>
            <Textarea value={body} readOnly rows={6} className="bg-muted" />
            <Button variant="outline" size="sm" onClick={() => handleCopy(body, "Email body")}>
              <Copy className="mr-2 h-4 w-4" /> Copy body
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Status will be updated to <strong>sent</strong> when you confirm below. If the quote was already sent, you can
            close this dialog without changing the status.
          </p>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Button variant="outline" onClick={closeDialog} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSent} disabled={isPending || status === "sent"}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : status === "sent" ? (
              "Already marked as sent"
            ) : (
              "Mark as sent"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
