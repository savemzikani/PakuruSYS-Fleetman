"use client"

import { formatDistanceToNow } from "date-fns"
import { BarChart3, Building2, Globe, Shield, TrendingUp, Users } from "lucide-react"
import {
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { PieLabelRenderProps } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type AdminAnalyticsData = {
  reportingWindowLabel: string
  reportingWindowMonths: number
  systemOverview: {
    totalCompanies: number
    newCompaniesLast30Days: number
    activeUsers: number
    newUsersLast30Days: number
    loadsLast30Days: number
    loadChangePercent: number | null
    deliveredRate: number | null
    deliveredCount: number
  }
  growthSeries: Array<{ month: string; companies: number; users: number; loads: number }>
  growthSummary: {
    companies: number | null
    users: number | null
    loads: number | null
  }
  revenueSummary: Array<{ currency: string; amount: number }>
  regionDistribution: Array<{ name: string; companies: number; users: number; loads: number }>
  companySegments: Array<{ label: string; companies: number; avgVehicles: number; avgMonthlyLoads: number }>
  loadStatus: Array<{ status: string; count: number }>
  recentEvents: Array<{ timestamp: string; event: string; type: "success" | "info" | "warning" | "error" }>
  companyUserMetrics: Array<{
    companyId: string | null
    companyName: string
    activeUsers: number
    totalUsers: number
    newUsersLast30Days: number
  }>
}

type RegionSlice = {
  name: string
  value: number
  users: number
  loads: number
  percent: number
}

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "—"
  }
  const rounded = value.toFixed(1)
  return `${value >= 0 ? "+" : ""}${rounded}%`
}

function eventBadge(type: "success" | "info" | "warning" | "error") {
  switch (type) {
    case "success":
      return "bg-emerald-100 text-emerald-800"
    case "warning":
      return "bg-amber-100 text-amber-800"
    case "error":
      return "bg-red-100 text-red-800"
    default:
      return "bg-blue-100 text-blue-800"
  }
}

const renderRegionLabel = ({ name, value, percent }: PieLabelRenderProps) => {
  const label = typeof name === "string" ? name : "Region"
  const companies = typeof value === "number" ? value : 0
  const share = typeof percent === "number" ? percent : 0
  return `${label}: ${companies.toLocaleString()} (${share.toFixed(1)}%)`
}

export function AdminAnalyticsDashboard({
  reportingWindowLabel,
  reportingWindowMonths,
  systemOverview,
  growthSeries,
  growthSummary,
  revenueSummary,
  regionDistribution,
  companySegments,
  loadStatus,
  recentEvents,
  companyUserMetrics,
}: AdminAnalyticsData) {
  const deliveredRateDisplay =
    systemOverview.deliveredRate === null ? "—" : `${systemOverview.deliveredRate.toFixed(1)}%`

  const regionTotal = regionDistribution.reduce((sum, item) => sum + item.companies, 0)
  const regionChartData: RegionSlice[] = regionDistribution.map((item) => ({
    name: item.name,
    value: item.companies,
    users: item.users,
    loads: item.loads,
    percent: regionTotal > 0 ? (item.companies / regionTotal) * 100 : 0,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Analytics</h1>
          <p className="text-muted-foreground">Platform-wide insights for {reportingWindowLabel.toLowerCase()}</p>
        </div>
        <Badge variant="outline" className="w-fit uppercase tracking-wide">
          {reportingWindowLabel}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemOverview.totalCompanies.toLocaleString()}</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="mr-1 h-3 w-3" />
              {systemOverview.newCompaniesLast30Days.toLocaleString()} new this month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemOverview.activeUsers.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              +{systemOverview.newUsersLast30Days.toLocaleString()} joined in 30 days
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loads (30 days)</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemOverview.loadsLast30Days.toLocaleString()}</div>
            <div
              className={`text-xs ${
                systemOverview.loadChangePercent === null
                  ? "text-muted-foreground"
                  : systemOverview.loadChangePercent >= 0
                    ? "text-green-600"
                    : "text-red-600"
              }`}
            >
              {formatPercent(systemOverview.loadChangePercent)} vs prior 30 days
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered Rate</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{deliveredRateDisplay}</div>
            <div className="text-xs text-muted-foreground">
              {systemOverview.deliveredCount.toLocaleString()} loads delivered
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="growth" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="growth">Growth</TabsTrigger>
          <TabsTrigger value="regional">Regional</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="growth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Platform Growth Trends
              </CardTitle>
              <CardDescription>New companies, active users, and load volume across {reportingWindowMonths} months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={growthSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  <Line type="monotone" dataKey="companies" stroke="#0891b2" name="Companies" strokeWidth={2} />
                  <Line type="monotone" dataKey="users" stroke="#10b981" name="Users" strokeWidth={2} />
                  <Line type="monotone" dataKey="loads" stroke="#f59e0b" name="Loads" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Growth Rate</CardTitle>
                <CardDescription>Change from first to last month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Companies</span>
                  <span className={growthSummary.companies && growthSummary.companies < 0 ? "text-red-600" : "text-green-600"}>
                    {formatPercent(growthSummary.companies)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Users</span>
                  <span className={growthSummary.users && growthSummary.users < 0 ? "text-red-600" : "text-green-600"}>
                    {formatPercent(growthSummary.users)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Load Volume</span>
                  <span className={growthSummary.loads && growthSummary.loads < 0 ? "text-red-600" : "text-green-600"}>
                    {formatPercent(growthSummary.loads)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">User Snapshot</CardTitle>
                <CardDescription>Engagement at a glance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Users</span>
                  <span className="font-medium">{systemOverview.activeUsers.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">New in 30 days</span>
                  <span className="font-medium">{systemOverview.newUsersLast30Days.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Revenue Snapshot</CardTitle>
                <CardDescription>Invoice volume by currency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {revenueSummary.length === 0 ? (
                  <p className="text-muted-foreground">No invoices issued in the reporting window.</p>
                ) : (
                  revenueSummary.map((entry) => (
                    <div key={entry.currency} className="flex justify-between">
                      <span className="text-muted-foreground">{entry.currency}</span>
                      <span className="font-medium">{entry.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="regional" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Regional Distribution
                </CardTitle>
                <CardDescription>Active companies by country</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={regionChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(props) => renderRegionLabel(props as PieLabelRenderProps)}
                    />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Regional Performance</CardTitle>
                <CardDescription>Key metrics by region</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {regionDistribution.length === 0 ? (
                  <p className="text-muted-foreground">No regional data available.</p>
                ) : (
                  regionDistribution.map((region) => (
                    <div key={region.name} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{region.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {region.companies.toLocaleString()} companies
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p>{region.users.toLocaleString()} users</p>
                        <p className="text-muted-foreground">{region.loads.toLocaleString()} loads</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="companies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Fleet Segmentation
              </CardTitle>
              <CardDescription>Active companies grouped by fleet size</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {companySegments.length === 0 ? (
                <p className="text-muted-foreground">No fleet data available.</p>
              ) : (
                companySegments.map((segment) => (
                  <div key={segment.label} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-lg font-semibold">{segment.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {segment.companies.toLocaleString()} companies
                      </p>
                    </div>
                    <div className="grid flex-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Avg Active Vehicles</p>
                        <p className="text-sm font-medium">{segment.avgVehicles.toFixed(1)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Avg Monthly Loads / Company</p>
                        <p className="text-sm font-medium">{segment.avgMonthlyLoads.toFixed(1)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Company User Overview</CardTitle>
              <CardDescription>Active and new users per company in the reporting window</CardDescription>
            </CardHeader>
            <CardContent className="overflow-hidden rounded-lg border p-0">
              {companyUserMetrics.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No user metrics available.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed text-sm">
                    <thead className="bg-muted/50">
                      <tr className="text-left">
                        <th className="w-2/5 px-4 py-3 font-medium">Company</th>
                        <th className="w-1/5 px-4 py-3 font-medium">Active Users</th>
                        <th className="w-1/5 px-4 py-3 font-medium">Total Users</th>
                        <th className="w-1/5 px-4 py-3 font-medium">New (30d)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companyUserMetrics.map((company) => (
                        <tr key={company.companyId ?? company.companyName} className="border-t">
                          <td className="px-4 py-3 font-medium text-foreground">{company.companyName}</td>
                          <td className="px-4 py-3 text-muted-foreground">{company.activeUsers.toLocaleString()}</td>
                          <td className="px-4 py-3 text-muted-foreground">{company.totalUsers.toLocaleString()}</td>
                          <td className="px-4 py-3 text-muted-foreground">{company.newUsersLast30Days.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Load Status Overview
                </CardTitle>
                <CardDescription>Loads recorded in the reporting window</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {loadStatus.length === 0 ? (
                  <p className="text-muted-foreground">No load activity recorded.</p>
                ) : (
                  loadStatus.map((item) => (
                    <div key={item.status} className="flex items-center justify-between rounded-lg border p-3">
                      <span className="font-medium capitalize">{item.status.replace(/_/g, " ")}</span>
                      <Badge variant="secondary">{item.count.toLocaleString()}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Platform Events</CardTitle>
                <CardDescription>Latest activity across the network</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentEvents.length === 0 ? (
                  <p className="text-muted-foreground">No recent events.</p>
                ) : (
                  recentEvents.map((event, index) => (
                    <div key={`${event.event}-${index}`} className="flex items-start gap-3 rounded-lg border p-3">
                      <span className={`mt-1 h-2 w-2 rounded-full ${eventBadge(event.type)}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.event}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
