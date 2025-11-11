"use client"

import { useMemo, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

interface QuoteTotalsAlertProps {
  quoteId: string
  currency: string
  storedSubtotal: number
  storedTaxAmount: number
  storedTotalAmount: number
  calculatedSubtotal: number
  calculatedTaxAmount: number
  calculatedTotalAmount: number
}

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(amount)

export function QuoteTotalsAlert({
  quoteId,
  currency,
  storedSubtotal,
  storedTaxAmount,
  storedTotalAmount,
  calculatedSubtotal,
  calculatedTaxAmount,
  calculatedTotalAmount,
}: QuoteTotalsAlertProps) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [isSyncing, startSync] = useTransition()

  const handleSync = () => {
    startSync(async () => {
      const { error } = await supabase
        .from("quotes")
        .update({
          subtotal: calculatedSubtotal,
          tax_amount: calculatedTaxAmount,
          total_amount: calculatedTotalAmount,
        })
        .eq("id", quoteId)

      if (error) {
        console.error("Failed to sync quote totals", error)
        toast.error("Unable to sync totals. Please try again.")
        return
      }

      toast.success("Quote totals synced with line items")
      router.refresh()
    })
  }

  return (
    <Alert variant="destructive" className="flex flex-col gap-4">
      <div>
        <AlertTitle>Totals out of sync</AlertTitle>
        <AlertDescription className="space-y-2 text-sm">
          <p>
            The stored totals on this quote dont match the sum of the line items. Syncing will update the quote to
            the following values:
          </p>
          <ul className="space-y-1 text-muted-foreground">
            <li>
              <strong>Subtotal:</strong> {formatCurrency(storedSubtotal, currency)} A {" "}
              <span className="font-semibold text-destructive">
                {formatCurrency(calculatedSubtotal, currency)}
              </span>
            </li>
            <li>
              <strong>Tax:</strong> {formatCurrency(storedTaxAmount, currency)} A {" "}
              <span className="font-semibold text-destructive">
                {formatCurrency(calculatedTaxAmount, currency)}
              </span>
            </li>
            <li>
              <strong>Total:</strong> {formatCurrency(storedTotalAmount, currency)} A {" "}
              <span className="font-semibold text-destructive">
                {formatCurrency(calculatedTotalAmount, currency)}
              </span>
            </li>
          </ul>
        </AlertDescription>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handleSync} disabled={isSyncing}>
          {isSyncing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            "Sync totals"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.refresh()}
          disabled={isSyncing}
        >
          Refresh
        </Button>
      </div>
    </Alert>
  )
}
