import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AnalyticsClient } from "@/components/admin/analytics-client"

export default async function AdminAnalyticsPage() {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .single()

  if (!profile || profile.role !== "super_admin") {
    redirect("/dashboard")
  }

  // Fetch real analytics data
  const { data: companies } = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false })

  const { data: users } = await supabase
    .from("profiles")
    .select("*")

  const { data: loads } = await supabase
    .from("loads")
    .select("*")

  // Calculate real metrics
  const totalCompanies = companies?.length || 0
  const totalUsers = users?.length || 0
  const totalLoads = loads?.length || 0
  const activeCompanies = companies?.filter(c => c.status === "active").length || 0

  return (
    <AnalyticsClient 
      totalCompanies={totalCompanies}
      totalUsers={totalUsers}
      totalLoads={totalLoads}
      activeCompanies={activeCompanies}
      companies={companies || []}
      users={users || []}
      loads={loads || []}
    />
  )
}
