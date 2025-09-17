import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { MetricCard } from "@/components/dashboard/metric-card"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Truck, Users, DollarSign, AlertTriangle } from "lucide-react"

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
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      *,
      company:companies(*)
    `)
    .eq("id", authUser.id)
    .single()

  if (!profile) {
    redirect("/auth/login")
  }

  // Redirect Super Admin to admin panel
  if (profile.role === "super_admin") {
    redirect("/admin")
  }

  // Get dashboard metrics based on user role and company
  const companyId = profile.company_id

  // Fetch metrics
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
        <RevenueChart data={chartData} />

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
              <div className="p-4 border border-border rounded-lg">
                <h3 className="font-medium mb-2">Create New Load</h3>
                <p className="text-sm text-muted-foreground mb-3">Add a new shipment to the system</p>
                <button className="text-sm text-primary hover:underline">Create Load →</button>
              </div>
              <div className="p-4 border border-border rounded-lg">
                <h3 className="font-medium mb-2">Assign Driver</h3>
                <p className="text-sm text-muted-foreground mb-3">Assign drivers to pending loads</p>
                <button className="text-sm text-primary hover:underline">View Pending →</button>
              </div>
              <div className="p-4 border border-border rounded-lg">
                <h3 className="font-medium mb-2">Generate Report</h3>
                <p className="text-sm text-muted-foreground mb-3">Create performance reports</p>
                <button className="text-sm text-primary hover:underline">Generate →</button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
