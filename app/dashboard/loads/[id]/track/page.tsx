"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/lib/hooks/use-user"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

export default function TrackLoadPage({ params }: { params: { id: string } }) {
  const { user } = useUser()
  const [history, setHistory] = useState<any[]>([])
  const [status, setStatus] = useState("in_transit")
  const [location, setLocation] = useState("")
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)

  const fetchHistory = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("load_tracking")
      .select("*")
      .eq("load_id", params.id)
      .order("created_at", { ascending: false })
    setHistory(data || [])
  }

  useEffect(() => { fetchHistory() }, [params.id])

  const submitUpdate = async () => {
    setLoading(true)
    try {
      const form = new FormData()
      form.set("status", status)
      form.set("location", location)
      if (latitude) form.set("latitude", latitude)
      if (longitude) form.set("longitude", longitude)
      if (notes) form.set("notes", notes)
      const res = await fetch(`/api/loads/${params.id}/tracking`, { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to add update")
      toast.success("Tracking updated")
      setLocation("")
      setLatitude("")
      setLongitude("")
      setNotes("")
      fetchHistory()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Load Tracking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="loading">Loading</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Location</Label><Input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country" /></div>
            <div className="space-y-2"><Label>Latitude</Label><Input value={latitude} onChange={e => setLatitude(e.target.value)} /></div>
            <div className="space-y-2"><Label>Longitude</Label><Input value={longitude} onChange={e => setLongitude(e.target.value)} /></div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
          </div>
          <Button onClick={submitUpdate} disabled={loading}>{loading ? "Saving..." : "Add Update"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {history.map((h) => (
              <div key={h.id} className="p-3 border rounded-md flex justify-between text-sm">
                <div>
                  <div className="font-medium">{h.status}</div>
                  <div className="text-muted-foreground">{h.location} {h.latitude && h.longitude ? `(${h.latitude}, ${h.longitude})` : ""}</div>
                  {h.notes ? <div className="text-muted-foreground">{h.notes}</div> : null}
                </div>
                <div className="text-muted-foreground">{new Date(h.created_at).toLocaleString()}</div>
              </div>
            ))}
            {history.length === 0 && <div className="text-muted-foreground">No updates yet.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


