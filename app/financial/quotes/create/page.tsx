"use client"

import { useCallback } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { QuoteForm } from "@/components/financial/quote-form"
import { Button } from "@/components/ui/button"

export default function CreateQuotePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const defaultCustomerId = searchParams.get("customer")

  const handleSuccess = useCallback(
    (quoteId: string) => {
      router.push(`/financial/quotes/${quoteId}`)
    },
    [router],
  )

  const handleCancel = useCallback(() => {
    router.push("/financial/quotes")
  }, [router])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/financial/quotes">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Quotes
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create Quote</h1>
          <p className="text-muted-foreground">Draft a new quote for your customer.</p>
        </div>
      </div>

      <QuoteForm mode="create" defaultCustomerId={defaultCustomerId} onSuccess={handleSuccess} onCancel={handleCancel} />
    </div>
  )
}
