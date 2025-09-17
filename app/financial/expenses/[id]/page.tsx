import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default async function ExpenseDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
  if (authError || !authUser) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles").select("*, company:companies(*)").eq("id", authUser.id).single()
  if (!profile?.company_id) redirect("/auth/login")

  const { data: expense } = await supabase
    .from("expenses")
    .select(`*, load:loads(*), vehicle:vehicles(*), submitted_by_profile:profiles!submitted_by(*), reviewed_by_profile:profiles!reviewed_by(*)`) 
    .eq("id", params.id)
    .eq("company_id", profile.company_id)
    .single()
  if (!expense) redirect("/financial/expenses")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Expense</h1>
        <div className="flex gap-2">
          {/* Future: approve/reject actions via API */}
          <Button variant="outline" asChild><a href="/financial/expenses">Back</a></Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid md:grid-cols-2 gap-4">
            <div><div className="text-sm text-muted-foreground">Category</div><div className="font-medium">{expense.category}</div></div>
            <div><div className="text-sm text-muted-foreground">Date</div><div className="font-medium">{new Date(expense.expense_date).toLocaleDateString()}</div></div>
            <div><div className="text-sm text-muted-foreground">Amount</div><div className="font-medium">{new Intl.NumberFormat("en-US", { style: "currency", currency: expense.currency || 'USD' }).format(expense.amount)}</div></div>
            <div><div className="text-sm text-muted-foreground">Status</div><div className="font-medium capitalize">{expense.status}</div></div>
            <div className="md:col-span-2"><div className="text-sm text-muted-foreground">Description</div><div className="font-medium">{expense.description}</div></div>
            {expense.notes && (<div className="md:col-span-2"><div className="text-sm text-muted-foreground">Notes</div><div className="font-medium">{expense.notes}</div></div>)}
            {expense.load && (<div><div className="text-sm text-muted-foreground">Load</div><div className="font-medium">{expense.load.load_number}</div></div>)}
            {expense.vehicle && (<div><div className="text-sm text-muted-foreground">Vehicle</div><div className="font-medium">{expense.vehicle.registration_number}</div></div>)}
            {expense.receipt_url && (<div className="md:col-span-2"><div className="text-sm text-muted-foreground">Receipt</div><a className="text-blue-600 hover:underline" href={expense.receipt_url} target="_blank">View Receipt</a></div>)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


