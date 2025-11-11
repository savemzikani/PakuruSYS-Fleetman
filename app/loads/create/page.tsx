"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { ArrowLeft } from "lucide-react"

import { LoadForm } from "@/components/loads/load-form"
import { Button } from "@/components/ui/button"

export default function CreateLoadPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const defaultCustomerId = searchParams.get("customer")
  const quoteId = searchParams.get("quoteId")

  const handleSuccess = useCallback(
    (loadId: string) => {
      router.push(`/loads/${loadId}`)
    },
    [router],
  )

  const handleCancel = useCallback(() => {
    router.push("/loads")
  }, [router])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/loads">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Loads
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create New Load</h1>
          <p className="text-muted-foreground">Add a new shipment to the system</p>
        </div>
      </div>

      <LoadForm
        mode="create"
        defaultCustomerId={defaultCustomerId}
        quoteId={quoteId}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  )
}
