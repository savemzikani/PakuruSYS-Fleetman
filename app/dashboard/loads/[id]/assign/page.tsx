"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/lib/hooks/use-user"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function AssignLoadPage({ params }: { params: { id: string } }) {
  const { user } = useUser()
  const router = useRouter()
  const [vehicles, setVehicles] = useState<Array<{ id: string; registration_number: string }>>([])
  const [drivers, setDrivers] = useState<Array<{ id: string; first_name: string; last_name: string }>>([])
  const [vehicleId, setVehicleId] = useState("")
  const [driverId, setDriverId] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!user?.company_id) return
      const supabase = createClient()
      const { data: vs } = await supabase
        .from("vehicles")
        .select("id, registration_number")
        .eq("company_id", user.company_id)
        .eq("status", "active")
        .order("registration_number")
      setVehicles(vs || [])

      const { data: ds } = await supabase
        .from("drivers")
        .select("id, first_name, last_name")
        .eq("company_id", user.company_id)
        .eq("is_active", true)
        .order("first_name")
      setDrivers(ds || [])
    }
    load()
  }, [user])

  const assign = async () => {
    if (!vehicleId && !driverId) {
      toast.error("Select at least a vehicle or a driver")
      return
    }
    setLoading(true)
    try {
      const calls: Promise<Response>[] = []
      if (vehicleId) calls.push(fetch(`/api/loads/${params.id}/assign-vehicle`, { method: "POST", body: JSON.stringify({ vehicleId }) }))
      if (driverId) calls.push(fetch(`/api/loads/${params.id}/assign-driver`, { method: "POST", body: JSON.stringify({ driverId }) }))
      const results = await Promise.all(calls)
      const ok = results.every(r => r.ok)
      if (!ok) {
        const errs = await Promise.all(results.map(r => r.ok ? Promise.resolve(null) : r.json()))
        throw new Error(errs.map(e => e?.error).filter(Boolean).join("; ") || "Assignment failed")
      }
      toast.success("Assignment updated")
      router.push(`/loads/${params.id}`)
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
          <CardTitle>Assign Vehicle and Driver</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.registration_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Driver</Label>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={assign} disabled={loading}>{loading ? "Saving..." : "Save Assignment"}</Button>
            <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


