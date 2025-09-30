"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/lib/hooks/use-user"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

export default function AddExpensePage() {
  const { user } = useUser()
  const router = useRouter()
  const [loads, setLoads] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [form, setForm] = useState({
    category: "fuel",
    description: "",
    amount: "",
    currency: "USD",
    expense_date: new Date().toISOString().split('T')[0],
    load_id: "",
    vehicle_id: "",
    notes: "",
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      if (!user?.company_id) return
      const supabase = createClient()
      const { data: ls } = await supabase.from("loads").select("id, load_number").eq("company_id", user.company_id).order("created_at", { ascending: false })
      setLoads(ls || [])
      const { data: vs } = await supabase.from("vehicles").select("id, registration_number").eq("company_id", user.company_id).order("registration_number")
      setVehicles(vs || [])
    }
    loadData()
  }, [user])

  const submit = async () => {
    setSaving(true)
    try {
      const body = new FormData()
      Object.entries(form).forEach(([k, v]) => v && body.append(k, v as string))
      const res = await fetch('/api/expenses', { method: 'POST', body })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create expense')
      toast.success('Expense created')
      router.push('/financial/expenses')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Expense</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['fuel','maintenance','repairs','tolls','insurance','permits','accommodation','meals','parking','fines','other'].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Amount</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Load</Label>
              <Select value={form.load_id} onValueChange={(v) => setForm({ ...form, load_id: v })}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {loads.map(l => (<SelectItem key={l.id} value={l.id}>{l.load_number}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <Select value={form.vehicle_id} onValueChange={(v) => setForm({ ...form, vehicle_id: v })}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => (<SelectItem key={v.id} value={v.id}>{v.registration_number}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2"><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional" /></div>
          </div>
          <Button onClick={submit} disabled={saving}>{saving ? 'Saving...' : 'Save Expense'}</Button>
        </CardContent>
      </Card>
    </div>
  )
}


