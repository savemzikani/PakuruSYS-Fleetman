"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/lib/hooks/use-user"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

function PortalQuotesPageContent() {
  const { user } = useUser()
  const [quotes, setQuotes] = useState<any[]>([])
  const supabase = createClient()

  const load = async () => {
    if (!user?.customer_id) return
    const { data } = await supabase
      .from("quotes")
      .select("*")
      .eq("customer_id", user.customer_id)
      .order("created_at", { ascending: false })
    setQuotes(data || [])
  }

  useEffect(() => { load() }, [user])

  const call = async (id: string, action: "accept"|"reject") => {
    try {
      const res = await fetch(`/api/quotes/${id}/${action}`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Failed to ${action}`)
      toast.success(data.message)
      load()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const statusColor = (s: string) => {
    switch (s) { case "accepted": return "bg-green-100 text-green-800"; case "rejected": return "bg-red-100 text-red-800"; case "sent": return "bg-blue-100 text-blue-800"; default: return "bg-gray-100 text-gray-800" }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Quotes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {quotes.map(q => (
            <div key={q.id} className="p-3 border rounded-md flex items-center justify-between">
              <div>
                <div className="font-semibold">{q.quote_number}</div>
                <div className="text-sm text-muted-foreground">Valid until {new Date(q.valid_until).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={statusColor(q.status)}>{q.status}</Badge>
                {q.status === 'sent' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => call(q.id, 'accept')}>Accept</Button>
                    <Button variant="outline" size="sm" onClick={() => call(q.id, 'reject')}>Reject</Button>
                  </>
                )}
              </div>
            </div>
          ))}
          {quotes.length === 0 && <div className="text-muted-foreground">No quotes yet.</div>}
        </CardContent>
      </Card>
    </div>
  )
}

// Dynamic import to prevent SSR issues
const PortalQuotesPage = dynamic(() => Promise.resolve(PortalQuotesPageContent), {
  ssr: false,
  loading: () => <div>Loading quotes...</div>
})

export default PortalQuotesPage


