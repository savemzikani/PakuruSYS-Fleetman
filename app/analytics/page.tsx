import { redirect } from "next/navigation"

import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard"
import { createClient } from "@/lib/supabase/server"

type InvoiceRow = {
  total_amount: number | null
  created_at: string
  currency: string | null
}

type ExpenseRow = {
  amount: number | null
  created_at: string
}

type LoadRow = {
  id: string
  status: string
  created_at: string
  pickup_city: string | null
  delivery_city: string | null
  driver: {
    first_name: string | null
    last_name: string | null
  } | null
}

type CustomerRow = {
  id: string
  created_at: string
}

type VehicleRow = {
  status: string | null
}

const REPORTING_MONTHS = 6

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/auth/login")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, company_id, first_name, company:companies(name)")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile) {
    redirect("/auth/login")
  }

  if (!profile.company_id) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          You need to be linked to a company before analytics can be displayed. Please contact your administrator.
        </p>
      </div>
    )
  }

  const companyId = profile.company_id

  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth() - (REPORTING_MONTHS - 1), 1)
  startDate.setHours(0, 0, 0, 0)
  const startDateIso = startDate.toISOString()

  const [invoiceResponse, expenseResponse, loadResponse, customerResponse, vehicleResponse] = await Promise.all([
    supabase
      .from("invoices")
      .select("total_amount, created_at, currency")
      .eq("company_id", companyId)
      .gte("created_at", startDateIso),
    supabase
      .from("expenses")
      .select("amount, created_at")
      .eq("company_id", companyId)
      .gte("created_at", startDateIso),
    supabase
      .from("loads")
      .select(
        `
        id,
        status,
        created_at,
        pickup_city,
        delivery_city,
        driver:drivers(first_name, last_name)
      `,
      )
      .eq("company_id", companyId)
      .gte("created_at", startDateIso),
    supabase
      .from("customers")
      .select("id, created_at")
      .eq("company_id", companyId)
      .gte("created_at", startDateIso),
    supabase.from("vehicles").select("id, status").eq("company_id", companyId),
  ])

  const invoices = (invoiceResponse.data ?? []) as InvoiceRow[]
  const expenses = (expenseResponse.data ?? []) as ExpenseRow[]
  const loads = (loadResponse.data ?? []) as LoadRow[]
  const customers = (customerResponse.data ?? []) as CustomerRow[]
  const vehicles = (vehicleResponse.data ?? []) as VehicleRow[]

  const currency = invoices[0]?.currency ?? "USD"

  const monthBuckets = Array.from({ length: REPORTING_MONTHS }, (_, index) => {
    const date = new Date(startDate.getFullYear(), startDate.getMonth() + index, 1)
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString("en-US", { month: "short" }),
    }
  })

  const revenueByMonth = invoices.reduce((acc, invoice) => {
    const date = new Date(invoice.created_at)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    acc.set(key, (acc.get(key) ?? 0) + Number(invoice.total_amount ?? 0))
    return acc
  }, new Map<string, number>())

  const expensesByMonth = expenses.reduce((acc, expense) => {
    const date = new Date(expense.created_at)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    acc.set(key, (acc.get(key) ?? 0) + Number(expense.amount ?? 0))
    return acc
  }, new Map<string, number>())

  const loadsByMonth = loads.reduce((acc, load) => {
    const date = new Date(load.created_at)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    acc.set(key, (acc.get(key) ?? 0) + 1)
    return acc
  }, new Map<string, number>())

  const customersByMonth = customers.reduce((acc, customer) => {
    const date = new Date(customer.created_at)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    acc.set(key, (acc.get(key) ?? 0) + 1)
    return acc
  }, new Map<string, number>())

  const revenueSeries = monthBuckets.map(({ key, label }) => {
    const revenue = revenueByMonth.get(key) ?? 0
    const expense = expensesByMonth.get(key) ?? 0
    return {
      month: label,
      revenue,
      expenses: expense,
      profit: revenue - expense,
    }
  })

  const monthlyLoadSeries = monthBuckets.map(({ key, label }) => ({
    month: label,
    loads: loadsByMonth.get(key) ?? 0,
    customers: customersByMonth.get(key) ?? 0,
  }))

  const loadStatusCounts = loads.reduce((acc, load) => {
    acc[load.status] = (acc[load.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const loadStatusSeries = Object.entries(loadStatusCounts)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)

  const totalRevenue = revenueSeries.reduce((sum, item) => sum + item.revenue, 0)
  const totalExpenses = revenueSeries.reduce((sum, item) => sum + item.expenses, 0)
  const netProfit = totalRevenue - totalExpenses
  const activeLoads = loads.filter((load) => load.status !== "delivered" && load.status !== "cancelled").length

  const vehicleStatusCounts = vehicles.reduce((acc, vehicle) => {
    const status = vehicle.status ?? "unknown"
    acc[status] = (acc[status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const totalVehicles = vehicles.length
  const activeVehicles = vehicleStatusCounts["active"] ?? 0
  const fleetUtilizationPercent = totalVehicles > 0 ? (activeVehicles / totalVehicles) * 100 : null

  const fleetBreakdown = Object.entries(vehicleStatusCounts).map(([status, count]) => ({
    name: status.replace(/_/g, " "),
    count,
    percentage: totalVehicles > 0 ? Number(((count / totalVehicles) * 100).toFixed(1)) : 0,
  }))

  const routeMap = loads.reduce((acc, load) => {
    const origin = load.pickup_city?.trim() || "Unknown origin"
    const destination = load.delivery_city?.trim() || "Unknown destination"
    const routeLabel = `${origin} → ${destination}`
    acc.set(routeLabel, (acc.get(routeLabel) ?? 0) + 1)
    return acc
  }, new Map<string, number>())

  const routePerformance = Array.from(routeMap.entries())
    .map(([route, count]) => ({ route, loads: count }))
    .sort((a, b) => b.loads - a.loads)
    .slice(0, 5)

  const driverMap = loads.reduce((acc, load) => {
    const first = load.driver?.first_name?.trim() ?? ""
    const last = load.driver?.last_name?.trim() ?? ""
    const name = `${first} ${last}`.trim()
    if (!name) {
      return acc
    }
    acc.set(name, (acc.get(name) ?? 0) + 1)
    return acc
  }, new Map<string, number>())

  const driverActivity = Array.from(driverMap.entries())
    .map(([name, count]) => ({ name, loads: count }))
    .sort((a, b) => b.loads - a.loads)
    .slice(0, 5)

  const metrics = {
    totalRevenue,
    totalExpenses,
    netProfit,
    activeLoads,
    fleetUtilizationPercent,
    customersCount: customers.length,
  }

  return (
    <AnalyticsDashboard
      companyName={profile.company?.name ?? null}
      metrics={metrics}
      revenueSeries={revenueSeries}
      loadStatusSeries={loadStatusSeries}
      monthlyLoadSeries={monthlyLoadSeries}
      fleetBreakdown={fleetBreakdown}
      routePerformance={routePerformance}
      driverActivity={driverActivity}
      currency={currency}
      reportingPeriodLabel={`Last ${REPORTING_MONTHS} Months`}
      reportingPeriodValue={`${REPORTING_MONTHS}months`}
    />
  )
}
