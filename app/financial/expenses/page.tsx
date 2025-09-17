import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
  if (authError || !authUser) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles").select("*, company:companies(*)").eq("id", authUser.id).single()
  if (!profile?.company_id) redirect("/auth/login")

  const { data: expenses } = await supabase
    .from("expenses")
    .select(`*, load:loads(load_number), vehicle:vehicles(registration_number)`) 
    .eq("company_id", profile.company_id)
    .order("expense_date", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">Company expenses linked to loads and vehicles</p>
        </div>
        <Link href="/financial/expenses/add"><Button>Add Expense</Button></Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {expenses?.map((e) => (
            <Link href={`/financial/expenses/${e.id}`} key={e.id} className="block">
              <div className="p-3 border rounded-md flex items-center justify-between hover:bg-muted/30">
                <div>
                  <div className="font-semibold">{e.category} • {e.description}</div>
                  <div className="text-sm text-muted-foreground">{new Date(e.expense_date).toLocaleDateString()} • Load {e.load?.load_number || 'N/A'} • Vehicle {e.vehicle?.registration_number || 'N/A'}</div>
                </div>
                <div className="font-semibold">{new Intl.NumberFormat("en-US", { style: "currency", currency: e.currency || 'USD' }).format(e.amount)}</div>
              </div>
            </Link>
          ))}
          {(!expenses || expenses.length === 0) && <div className="text-muted-foreground">No expenses found.</div>}
        </CardContent>
      </Card>
    </div>
  )
}


