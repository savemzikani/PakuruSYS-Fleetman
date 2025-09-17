import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Building2, Users, Activity } from "lucide-react"

export default async function AdminDashboard() {
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

  // Fetch real data for Super Admin dashboard
  const [
    { data: pendingApplications, count: pendingCount },
    { data: companies, count: companiesCount },
    { data: users, count: usersCount },
    { data: recentApplications },
  ] = await Promise.all([
    supabase
      .from("fleet_applications")
      .select("*", { count: "exact" })
      .eq("status", "pending"),
    supabase
      .from("companies")
      .select("*", { count: "exact" })
      .eq("status", "active"),
    supabase
      .from("profiles")
      .select("*", { count: "exact" }),
    supabase
      .from("fleet_applications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3),
  ])
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage company applications and system-wide settings</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount || 0}</div>
            <p className="text-xs text-muted-foreground">{pendingCount ? `${pendingCount} awaiting review` : 'No pending applications'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companiesCount || 0}</div>
            <p className="text-xs text-muted-foreground">{companiesCount ? `${companiesCount} active companies` : 'No companies yet'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersCount || 0}</div>
            <p className="text-xs text-muted-foreground">{usersCount ? `${usersCount} total users` : 'No users yet'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.9%</div>
            <p className="text-xs text-muted-foreground">Uptime this month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Applications</CardTitle>
            <CardDescription>Latest company registration requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentApplications && recentApplications.length > 0 ? (
                recentApplications.map((app) => (
                  <div key={app.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{app.company_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {app.country} • {new Date(app.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={app.status === "pending" ? "secondary" : "outline"}>{app.status}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recent applications</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Activity</CardTitle>
            <CardDescription>Recent system-wide events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {companies && companies.length > 0 ? (
                companies.slice(0, 3).map((company) => (
                  <div key={company.id} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full mt-2" />
                    <div>
                      <p className="font-medium">Company: {company.name}</p>
                      <p className="text-sm text-muted-foreground">{company.country}</p>
                      <p className="text-xs text-muted-foreground">Created: {new Date(company.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No company activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
