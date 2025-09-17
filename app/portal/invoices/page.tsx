"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/lib/hooks/use-user"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default function PortalInvoicesPage() {
  const { user } = useUser()
  const [invoices, setInvoices] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.customer_id) return
      const supabase = createClient()
      const { data } = await supabase
        .from("invoices")
        .select("*")
        .eq("customer_id", user.customer_id)
        .order("created_at", { ascending: false })
      setInvoices(data || [])
    }
    fetchData()
  }, [user])

  const statusColor = (s: string) => {
    switch (s) { case "paid": return "bg-green-100 text-green-800"; case "overdue": return "bg-red-100 text-red-800"; default: return "bg-yellow-100 text-yellow-800" }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Invoices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {invoices.map(inv => (
            <div key={inv.id} className="p-3 border rounded-md flex items-center justify-between">
              <div>
                <div className="font-semibold">{inv.invoice_number}</div>
                <div className="text-sm text-muted-foreground">Issued {new Date(inv.issue_date).toLocaleDateString()} • Due {new Date(inv.due_date).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={statusColor(inv.status)}>{inv.status}</Badge>
                <Link href={`/api/pdf/invoice/${inv.id}`}>Download PDF</Link>
              </div>
            </div>
          ))}
          {invoices.length === 0 && <div className="text-muted-foreground">No invoices yet.</div>}
        </CardContent>
      </Card>
    </div>
  )
}


