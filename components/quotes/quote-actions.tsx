"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Send, CheckCircle, XCircle, FileDown } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function QuoteActions({ id, status, convertedToInvoiceId }: { id: string; status: string; convertedToInvoiceId?: string | null }) {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  const call = async (url: string, label: string) => {
    try {
      setLoading(label)
      const res = await fetch(url, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Failed to ${label.toLowerCase()}`)
      toast.success(data.message || `${label} successful`)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex gap-2">
      {status === "draft" && (
        <Button onClick={() => call(`/api/quotes/${id}/send`, "Send Quote")} disabled={loading !== null}>
          <Send className="h-4 w-4 mr-2" />
          {loading === "Send Quote" ? "Sending..." : "Send Quote"}
        </Button>
      )}
      {status === "sent" && (
        <>
          <Button variant="outline" onClick={() => call(`/api/quotes/${id}/accept`, "Accept Quote")} disabled={loading !== null}>
            <CheckCircle className="h-4 w-4 mr-2" />
            {loading === "Accept Quote" ? "Accepting..." : "Mark as Accepted"}
          </Button>
          <Button variant="outline" onClick={() => call(`/api/quotes/${id}/reject`, "Reject Quote")} disabled={loading !== null}>
            <XCircle className="h-4 w-4 mr-2" />
            {loading === "Reject Quote" ? "Rejecting..." : "Mark as Rejected"}
          </Button>
        </>
      )}
      {status === "accepted" && !convertedToInvoiceId && (
        <Button variant="outline" onClick={() => call(`/api/quotes/${id}/convert`, "Convert Quote")} disabled={loading !== null}>
          <FileDown className="h-4 w-4 mr-2" />
          {loading === "Convert Quote" ? "Converting..." : "Convert to Invoice"}
        </Button>
      )}
    </div>
  )
}


