import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { MetricCard } from "@/components/dashboard/metric-card"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Truck, Users, DollarSign, TrendingUp, AlertTriangle, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    redirect("/auth/login")
  }

  // Get user profile with company info
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      *,
      company:companies(*)
    `)
    .eq("id", authUser.id)
    .single()

  if (profileError || !profile) {
    redirect("/auth/login")
  }

  // Handle super admin dashboard
  if (profile.role === "super_admin") {
    const [{ count: totalCompanies }, { count: totalLoads }, { count: totalDrivers }, { data: pendingApplications }] =
      await Promise.all([
        supabase.from("companies").select("*", { count: "exact", head: true }),
        supabase.from("loads").select("*", { count: "exact", head: true }),
        supabase.from("drivers").select("*", { count: "exact", head: true }),
        supabase
          .from("company_applications")
          .select(
            `
            *,
            company:companies(*)
          `,
          )
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(5),
      ])

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Overview</h1>
          <p className="text-muted-foreground">Monitor all SADC logistics operations across the region.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Active Companies" value={totalCompanies || 0} icon={Building2} />
          <MetricCard title="Total Loads" value={totalLoads || 0} icon={Package} />
          <MetricCard title="All Drivers" value={totalDrivers || 0} icon={Users} />
          <MetricCard
            title="Pending Applications"
            value={pendingApplications?.length || 0}
            changeType={pendingApplications && pendingApplications.length > 0 ? "warning" : "positive"}
            icon={AlertTriangle}
          />
        </div>

        {pendingApplications && pendingApplications.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Pending Company Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingApplications.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-3 border border-yellow-200 rounded-lg dark:border-yellow-900"
                  >
                    <div>
                      <p className="font-medium text-foreground">{app.company_name}</p>
                      <p className="text-sm text-muted-foreground">{app.company?.registration_number || "N/A"}</p>
                    </div>
                    <Button size="sm" asChild>
                      <Link href="/admin/applications">Review</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  if (!profile.company_id) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">No Company Associated</h1>
          <p className="text-muted-foreground">Please contact your administrator to join a company.</p>
        </div>
      </div>
    )
  }

  const companyId = profile.company_id

  const [
    { count: totalLoads },
    { count: activeVehicles },
    { count: totalDrivers },
    { data: recentLoads },
    { data: monthlyRevenue },
  ] = await Promise.all([
    supabase.from("loads").select("*", { count: "exact", head: true }).eq("company_id", companyId),
    supabase
      .from("vehicles")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "active"),
    supabase.from("drivers").select("*", { count: "exact", head: true }).eq("company_id", companyId),
    supabase
      .from("loads")
      .select(`
        *,
        customer:customers(name),
        vehicle:vehicles(registration_number),
        driver:drivers(first_name, last_name)
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("invoices")
      .select("total_amount, created_at")
      .eq("company_id", companyId)
      .gte("created_at", new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  // Process monthly revenue data for chart
  const revenueByMonth = monthlyRevenue?.reduce(
    (acc, invoice) => {
      const month = new Date(invoice.created_at).toLocaleDateString("en-US", { month: "short" })
      acc[month] = (acc[month] || 0) + Number(invoice.total_amount)
      return acc
    },
    {} as Record<string, number>,
  )

  const chartData = Object.entries(revenueByMonth || {}).map(([month, revenue]) => ({
    month,
    revenue,
  }))

  // Recent activity data
  const recentActivity = recentLoads?.map((load) => ({
    id: load.id,
    type: "load" as const,
    title: `Load ${load.load_number}`,
    description: `${load.customer?.name} - ${load.pickup_city} to ${load.delivery_city}`,
    timestamp: load.created_at,
    status: load.status,
  }))

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome back, {profile.first_name}</h1>
        <p className="text-muted-foreground">Here's what's happening with your logistics operations today.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Loads"
          value={totalLoads || 0}
          change="+12% from last month"
          changeType="positive"
          icon={Package}
        />
        <MetricCard
          title="Active Vehicles"
          value={activeVehicles || 0}
          change="2 in maintenance"
          changeType="neutral"
          icon={Truck}
        />
        <MetricCard title="Drivers" value={totalDrivers || 0} change="All active" changeType="positive" icon={Users} />
        <MetricCard
          title="Monthly Revenue"
          value={`$${chartData.reduce((sum, item) => sum + item.revenue, 0).toLocaleString()}`}
          change="+8% from last month"
          changeType="positive"
          icon={DollarSign}
        />
      </div>

      {/* Charts and Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-300 text-muted-foreground">
                No revenue data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <RecentActivity activities={recentActivity || []} />
      </div>

      {/* Quick Actions */}
      {(profile.role === "company_admin" || profile.role === "manager" || profile.role === "dispatcher") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Button asChild variant="outline" className="h-auto flex-col items-start p-4 bg-transparent">
                <Link href="/loads">
                  <h3 className="font-medium mb-2">Create New Load</h3>
                  <p className="text-sm text-muted-foreground">Add a new shipment to the system</p>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto flex-col items-start p-4 bg-transparent">
                <Link href="/loads">
                  <h3 className="font-medium mb-2">Assign Driver</h3>
                  <p className="text-sm text-muted-foreground">Assign drivers to pending loads</p>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto flex-col items-start p-4 bg-transparent">
                <Link href="/reports">
                  <h3 className="font-medium mb-2">Generate Report</h3>
                  <p className="text-sm text-muted-foreground">Create performance reports</p>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
