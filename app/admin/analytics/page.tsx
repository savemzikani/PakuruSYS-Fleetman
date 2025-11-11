import { redirect } from "next/navigation"

import { AdminAnalyticsDashboard } from "@/components/admin/analytics-dashboard"
import { createClient } from "@/lib/supabase/server"

const REPORTING_MONTHS = 6
const REPORTING_LABEL = `Last ${REPORTING_MONTHS} Months`

type CompanyRow = {
  id: string
  name: string | null
  country: string | null
  created_at: string
}

type ProfileRow = {
  id: string
  company_id: string | null
  is_active: boolean | null
  created_at: string
  role: string | null
}

type LoadRow = {
  id: string
  company_id: string | null
  status: string | null
  load_number: string | null
  created_at: string
}

type InvoiceRow = {
  id: string
  company_id: string | null
  currency: string | null
  total_amount: number | null
  created_at: string
}

type VehicleRow = {
  id: string
  company_id: string | null
  status: string | null
}

type CompanyUserMetric = {
  companyId: string | null
  companyName: string
  activeUsers: number
  totalUsers: number
  newUsersLast30Days: number
}

const COMPANY_SEGMENTS = [
  { label: "Large Fleet (50+)", min: 50, max: Number.POSITIVE_INFINITY },
  { label: "Medium Fleet (20-49)", min: 20, max: 49 },
  { label: "Small Fleet (5-19)", min: 5, max: 19 },
  { label: "Independent (0-4)", min: 0, max: 4 },
] as const

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`
}

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short" })
}

function normalizeCountry(country: string | null | undefined) {
  if (!country) {
    return "Unspecified"
  }

  const trimmed = country.trim()
  return trimmed.length > 0 ? trimmed : "Unspecified"
}

function computeGrowthPercent(values: number[]): number | null {
  if (values.length === 0) {
    return null
  }

  const first = values[0]
  const last = values[values.length - 1]

  if (first === 0) {
    return last === 0 ? 0 : null
  }

  return ((last - first) / first) * 100
}

function sumByCurrency(rows: InvoiceRow[]) {
  const bucket = new Map<string, number>()

  for (const invoice of rows) {
    const currency = invoice.currency ?? "USD"
    const amount = typeof invoice.total_amount === "number" ? invoice.total_amount : Number(invoice.total_amount ?? 0)
    bucket.set(currency, (bucket.get(currency) ?? 0) + (Number.isFinite(amount) ? amount : 0))
  }

  return Array.from(bucket.entries())
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => b.amount - a.amount)
}

function monthCounts<T extends { created_at: string }>(rows: T[], start: Date) {
  const counts = new Map<string, number>()

  for (const row of rows) {
    const createdAt = row.created_at ? new Date(row.created_at) : null
    if (!createdAt || Number.isNaN(createdAt.valueOf()) || createdAt < start) {
      continue
    }

    const key = toMonthKey(new Date(createdAt.getFullYear(), createdAt.getMonth(), 1))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return counts
}

function getLoadEventType(status: string | null | undefined): "success" | "info" | "warning" | "error" {
  switch ((status ?? "").toLowerCase()) {
    case "delivered":
      return "success"
    case "cancelled":
      return "error"
    case "pending":
    case "assigned":
      return "warning"
    default:
      return "info"
  }
}

export default async function AdminAnalyticsPage() {
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
    .select("id, role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    redirect("/auth/login")
  }

  if (profile.role !== "super_admin") {
    redirect("/dashboard")
  }

  const now = new Date()
  const reportingStart = new Date(now.getFullYear(), now.getMonth() - (REPORTING_MONTHS - 1), 1)
  reportingStart.setHours(0, 0, 0, 0)
  const reportingStartIso = reportingStart.toISOString()

  const last30Start = new Date(now)
  last30Start.setDate(last30Start.getDate() - 30)
  last30Start.setHours(0, 0, 0, 0)

  const previous30Start = new Date(last30Start)
  previous30Start.setDate(previous30Start.getDate() - 30)
  previous30Start.setHours(0, 0, 0, 0)

  const monthBuckets = Array.from({ length: REPORTING_MONTHS }, (_, index) => {
    const date = new Date(reportingStart.getFullYear(), reportingStart.getMonth() + index, 1)
    return { key: toMonthKey(date), label: formatMonthLabel(date) }
  })

  const [companiesRes, profilesRes, loadsRes, invoicesRes, vehiclesRes] = await Promise.all([
    supabase.from("companies").select("id, name, country, created_at"),
    supabase.from("profiles").select("id, company_id, is_active, created_at, role"),
    supabase
      .from("loads")
      .select("id, company_id, status, load_number, created_at")
      .gte("created_at", reportingStartIso),
    supabase
      .from("invoices")
      .select("id, company_id, total_amount, currency, created_at")
      .gte("created_at", reportingStartIso),
    supabase.from("vehicles").select("id, company_id, status"),
  ])

  if (companiesRes.error) {
    console.error("[admin:analytics] Failed to load companies", companiesRes.error)
  }

  if (profilesRes.error) {
    console.error("[admin:analytics] Failed to load profiles", profilesRes.error)
  }

  if (loadsRes.error) {
    console.error("[admin:analytics] Failed to load loads", loadsRes.error)
  }

  if (invoicesRes.error) {
    console.error("[admin:analytics] Failed to load invoices", invoicesRes.error)
  }

  if (vehiclesRes.error) {
    console.error("[admin:analytics] Failed to load vehicles", vehiclesRes.error)
  }

  const companies = (companiesRes.data ?? []) as CompanyRow[]
  const profiles = (profilesRes.data ?? []) as ProfileRow[]
  const loads = (loadsRes.data ?? []) as LoadRow[]
  const invoices = (invoicesRes.data ?? []) as InvoiceRow[]
  const vehicles = (vehiclesRes.data ?? []) as VehicleRow[]

  const totalCompanies = companies.length
  const newCompaniesLast30Days = companies.filter((company) => {
    const createdAt = new Date(company.created_at)
    return createdAt >= last30Start
  }).length

  const activeUsers = profiles.filter((profileRow) => profileRow.is_active !== false).length
  const newUsersLast30Days = profiles.filter((profileRow) => new Date(profileRow.created_at) >= last30Start).length

  const loadsLast30 = loads.filter((load) => new Date(load.created_at) >= last30Start)
  const loadsPrevious30 = loads.filter((load) => {
    const createdAt = new Date(load.created_at)
    return createdAt >= previous30Start && createdAt < last30Start
  })

  const loadsLast30Days = loadsLast30.length
  const previousLoadCount = loadsPrevious30.length

  const loadChangePercent = previousLoadCount === 0 ? null : ((loadsLast30Days - previousLoadCount) / previousLoadCount) * 100

  const deliveredLoads = loads.filter((load) => (load.status ?? "").toLowerCase() === "delivered")
  const deliveredRate = loads.length === 0 ? null : (deliveredLoads.length / loads.length) * 100

  const companyCountsByMonth = monthCounts(companies, reportingStart)
  const userCountsByMonth = monthCounts(profiles, reportingStart)
  const loadCountsByMonth = monthCounts(loads, reportingStart)

  const growthSeries = monthBuckets.map(({ key, label }) => ({
    month: label,
    companies: companyCountsByMonth.get(key) ?? 0,
    users: userCountsByMonth.get(key) ?? 0,
    loads: loadCountsByMonth.get(key) ?? 0,
  }))

  const growthSummary = {
    companies: computeGrowthPercent(growthSeries.map((row) => row.companies)),
    users: computeGrowthPercent(growthSeries.map((row) => row.users)),
    loads: computeGrowthPercent(growthSeries.map((row) => row.loads)),
  }

  const revenueSummary = sumByCurrency(invoices)

  const userStatsByCompany = new Map<string | null, { total: number; active: number; new30: number }>()
  for (const profileRow of profiles) {
    const key = profileRow.company_id ?? null
    const stats = userStatsByCompany.get(key) ?? { total: 0, active: 0, new30: 0 }
    stats.total += 1
    if (profileRow.is_active !== false) {
      stats.active += 1
    }
    if (new Date(profileRow.created_at) >= last30Start) {
      stats.new30 += 1
    }
    userStatsByCompany.set(key, stats)
  }

  const loadCountsByCompany = new Map<string | null, number>()
  const loadStatusCounts = new Map<string, number>()

  for (const load of loads) {
    const companyKey = load.company_id ?? null
    loadCountsByCompany.set(companyKey, (loadCountsByCompany.get(companyKey) ?? 0) + 1)

    const statusKey = (load.status ?? "unknown").toLowerCase()
    loadStatusCounts.set(statusKey, (loadStatusCounts.get(statusKey) ?? 0) + 1)
  }

  const vehicleCountsByCompany = new Map<string | null, number>()
  for (const vehicle of vehicles) {
    if (vehicle.status && vehicle.status.toLowerCase() === "retired") {
      continue
    }
    const key = vehicle.company_id ?? null
    vehicleCountsByCompany.set(key, (vehicleCountsByCompany.get(key) ?? 0) + 1)
  }

  const regionDistribution = Array.from(
    companies.reduce((acc, company) => {
      const region = normalizeCountry(company.country)
      const bucket = acc.get(region) ?? { companies: 0, users: 0, loads: 0 }
      bucket.companies += 1
      const userStats = userStatsByCompany.get(company.id) ?? { total: 0, active: 0, new30: 0 }
      bucket.users += userStats.total
      bucket.loads += loadCountsByCompany.get(company.id) ?? 0
      acc.set(region, bucket)
      return acc
    }, new Map<string, { companies: number; users: number; loads: number }>()),
  ).map(([name, metrics]) => ({ name, ...metrics }))

  const companySegments = COMPANY_SEGMENTS.map((segment) => {
    const matchedCompanies = companies.filter((company) => {
      const vehicleCount = vehicleCountsByCompany.get(company.id) ?? 0
      return vehicleCount >= segment.min && vehicleCount <= segment.max
    })

    const totalVehicles = matchedCompanies.reduce((sum, company) => sum + (vehicleCountsByCompany.get(company.id) ?? 0), 0)
    const totalLoads = matchedCompanies.reduce((sum, company) => sum + (loadCountsByCompany.get(company.id) ?? 0), 0)

    return {
      label: segment.label,
      companies: matchedCompanies.length,
      avgVehicles: matchedCompanies.length === 0 ? 0 : totalVehicles / matchedCompanies.length,
      avgMonthlyLoads:
        matchedCompanies.length === 0 ? 0 : totalLoads / matchedCompanies.length / REPORTING_MONTHS,
    }
  })

  const loadStatus = Array.from(loadStatusCounts.entries()).map(([status, count]) => ({ status, count }))

  const recentEvents = [...loads]
    .sort((a, b) => new Date(b.created_at).valueOf() - new Date(a.created_at).valueOf())
    .slice(0, 5)
    .map((load) => ({
      timestamp: load.created_at,
      event: `Load ${load.load_number ?? load.id.slice(0, 8)} ${ (load.status ?? "updated").replace(/_/g, " ") }`,
      type: getLoadEventType(load.status),
    }))

  const companyUserMetrics: CompanyUserMetric[] = companies.map((company) => {
    const stats = userStatsByCompany.get(company.id) ?? { total: 0, active: 0, new30: 0 }
    return {
      companyId: company.id,
      companyName: company.name ?? "Unnamed Company",
      activeUsers: stats.active,
      totalUsers: stats.total,
      newUsersLast30Days: stats.new30,
    }
  })

  const unassignedStats = userStatsByCompany.get(null)
  if (unassignedStats && unassignedStats.total > 0) {
    companyUserMetrics.push({
      companyId: null,
      companyName: "Unassigned",
      activeUsers: unassignedStats.active,
      totalUsers: unassignedStats.total,
      newUsersLast30Days: unassignedStats.new30,
    })
  }

  companyUserMetrics.sort((a, b) => b.activeUsers - a.activeUsers)

  const adminAnalyticsData = {
    reportingWindowLabel: REPORTING_LABEL,
    reportingWindowMonths: REPORTING_MONTHS,
    systemOverview: {
      totalCompanies,
      newCompaniesLast30Days,
      activeUsers,
      newUsersLast30Days,
      loadsLast30Days,
      loadChangePercent,
      deliveredRate,
      deliveredCount: deliveredLoads.length,
    },
    growthSeries,
    growthSummary,
    revenueSummary,
    regionDistribution,
    companySegments,
    loadStatus,
    recentEvents,
    companyUserMetrics,
  }

  return <AdminAnalyticsDashboard {...adminAnalyticsData} />
}
