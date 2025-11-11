"use client"

import { useCallback } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { QuoteForm } from "@/components/financial/quote-form"
import { Button } from "@/components/ui/button"

export default function EditQuotePage() {
  const router = useRouter()
  const params = useParams<{ quoteId: string }>()
  const quoteId = params?.quoteId

  const handleSuccess = useCallback(
    (updatedId: string) => {
      router.push(`/financial/quotes/${updatedId}`)
    },
    [router],
  )

  const handleCancel = useCallback(() => {
    if (quoteId) {
      router.push(`/financial/quotes/${quoteId}`)
    } else {
      router.push("/financial/quotes")
    }
  }, [quoteId, router])

  if (!quoteId || typeof quoteId !== "string") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Invalid quote ID.</p>
        <Link href="/financial/quotes">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Quotes
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/financial/quotes/${quoteId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Quote
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit Quote</h1>
          <p className="text-muted-foreground">Update the quote details and line items.</p>
        </div>
      </div>

      <QuoteForm mode="edit" quoteId={quoteId} onSuccess={handleSuccess} onCancel={handleCancel} />
    </div>
  )
}
