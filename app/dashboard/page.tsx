import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { Invoice, Load } from "@/lib/types/database"
import { MetricCard } from "@/components/dashboard/metric-card"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Truck, Users, DollarSign, TrendingUp, AlertTriangle, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { DashboardRevenueChart } from "@/components/dashboard/revenue-chart"

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

    type PendingApplication = {
      id: string
      company_name: string
      company?: { registration_number?: string | null } | null
    }

    const pendingApplicationList = (pendingApplications ?? []) as PendingApplication[]

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
            value={pendingApplicationList.length}
            changeType={pendingApplicationList.length > 0 ? "negative" : "positive"}
            icon={AlertTriangle}
          />
        </div>

        {pendingApplicationList.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Pending Company Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingApplicationList.map((app) => (
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

  const monthsBack = 6
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1)
  startDate.setHours(0, 0, 0, 0)
  const startDateIso = startDate.toISOString()

  const monthBuckets = Array.from({ length: monthsBack }, (_, index) => {
    const date = new Date(startDate.getFullYear(), startDate.getMonth() + index, 1)
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString("en-US", { month: "short" }),
    }
  })

  const [
    { count: totalLoads },
    { count: activeVehicles },
    { count: totalDrivers },
    { data: recentLoads },
    { data: monthlyInvoices },
    { data: monthlyLoadRecords },
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
      .gte("created_at", startDateIso),
    supabase
      .from("loads")
      .select("id, created_at")
      .eq("company_id", companyId)
      .gte("created_at", startDateIso),
  ])

  type RecentLoadRow = Pick<Load, "id" | "load_number" | "pickup_city" | "delivery_city" | "created_at" | "status"> & {
    customer?: { name?: string | null } | null
  }

  const recentLoadList = (recentLoads ?? []) as RecentLoadRow[]
  const invoiceRecords = (monthlyInvoices ?? []) as Array<Pick<Invoice, "total_amount" | "created_at">>
  const loadTrendRecordsList = (monthlyLoadRecords ?? []) as Array<Pick<Load, "id" | "created_at">>

  const loadCountsByMonth = loadTrendRecordsList.reduce<Record<string, number>>((acc, load) => {
    const createdAt = load.created_at
    if (!createdAt) {
      return acc
    }
    const date = new Date(createdAt)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  const revenueTotalsByMonth = invoiceRecords.reduce<Record<string, number>>((acc, invoice) => {
    const date = new Date(invoice.created_at)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    const amount = Number(invoice.total_amount ?? 0)
    acc[key] = (acc[key] ?? 0) + amount
    return acc
  }, {})

  const loadTrend = monthBuckets.map(({ key, label }) => ({
    month: label,
    count: loadCountsByMonth[key] ?? 0,
  }))

  const revenueTrend = monthBuckets.map(({ key, label }) => ({
    month: label,
    revenue: revenueTotalsByMonth[key] ?? 0,
  }))

  const lastTwoMonths = loadTrend.slice(-2)
  const [previousLoadMonth, currentLoadMonth] =
    lastTwoMonths.length === 2 ? lastTwoMonths : [undefined, lastTwoMonths[0]]
  const loadChange =
    previousLoadMonth && currentLoadMonth ? currentLoadMonth.count - previousLoadMonth.count : 0
  const loadChangePercent =
    previousLoadMonth && currentLoadMonth && previousLoadMonth.count > 0
      ? (loadChange / previousLoadMonth.count) * 100
      : null

  const revenueChangePercent = (() => {
    if (revenueTrend.length < 2) {
      return null
    }
    const previous = revenueTrend[revenueTrend.length - 2]
    const current = revenueTrend[revenueTrend.length - 1]
    if (!previous || previous.revenue === 0) {
      return null
    }
    return ((current.revenue - previous.revenue) / previous.revenue) * 100
  })()

  const driverChange = 0 // placeholder until driver trend data is available
  const chartData = revenueTrend
  const totalRevenueForPeriod = chartData.reduce((sum, point) => sum + point.revenue, 0)

  // Recent activity data
  const recentActivity = recentLoadList.map((load) => ({
    id: load.id,
    type: "load" as const,
    title: `Load ${load.load_number}`,
    description: `${load.customer?.name ?? "Customer"} - ${load.pickup_city ?? "Origin"} to ${
      load.delivery_city ?? "Destination"
    }`,
    timestamp: load.created_at,
    status: load.status,
  }))

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome back, {profile.first_name}</h1>
        <p className="text-muted-foreground">Here&apos;s what&apos;s happening with your logistics operations today.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Loads"
          value={totalLoads || 0}
          change={
            loadChangePercent === null
              ? "No prior month"
              : `${loadChangePercent >= 0 ? "+" : ""}${loadChangePercent.toFixed(1)}% vs last month`
          }
          changeType={loadChangePercent === null ? "neutral" : loadChangePercent >= 0 ? "positive" : "negative"}
          icon={Package}
        />
        <MetricCard
          title="Active Vehicles"
          value={activeVehicles || 0}
          change="2 in maintenance"
          changeType="neutral"
          icon={Truck}
        />
        <MetricCard
          title="Drivers"
          value={totalDrivers || 0}
          change={driverChange === 0 ? "No change" : `${driverChange > 0 ? "+" : ""}${driverChange} vs last month`}
          changeType={driverChange === 0 ? "neutral" : driverChange > 0 ? "positive" : "negative"}
          icon={Users}
        />
        <MetricCard
          title="Monthly Revenue"
          value={`$${totalRevenueForPeriod.toLocaleString()}`}
          change={
            revenueChangePercent === null
              ? "No prior month"
              : `${revenueChangePercent >= 0 ? "+" : ""}${revenueChangePercent.toFixed(1)}% vs last month`
          }
          changeType={
            revenueChangePercent === null ? "neutral" : revenueChangePercent >= 0 ? "positive" : "negative"
          }
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
            <DashboardRevenueChart data={chartData} />
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
