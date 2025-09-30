import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BarChart3, FileText, TrendingUp, Download, Calendar, Filter } from "lucide-react"

export default async function ReportsPage() {
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
    .select("*, company:companies(*)")
    .eq("id", authUser.id)
    .single()

  if (!profile || !profile.company_id) {
    redirect("/auth/login")
  }

  // Check permissions
  if (!["super_admin", "company_admin", "manager"].includes(profile.role)) {
    redirect("/dashboard")
  }

  // Fetch basic analytics data
  const [
    { data: loads },
    { data: invoices },
    { data: vehicles },
    { data: drivers }
  ] = await Promise.all([
    supabase.from("loads").select("status, rate, currency, created_at").eq("company_id", profile.company_id),
    supabase.from("invoices").select("status, total_amount, currency, created_at").eq("company_id", profile.company_id),
    supabase.from("vehicles").select("status, created_at").eq("company_id", profile.company_id),
    supabase.from("drivers").select("is_active, created_at").eq("company_id", profile.company_id)
  ])

  const reportTypes = [
    {
      id: "loads",
      title: "Loads Report",
      description: "Detailed analysis of shipments, routes, and delivery performance",
      icon: BarChart3,
      metrics: [
        `Total Loads: ${loads?.length || 0}`,
        `Delivered: ${loads?.filter(l => l.status === 'delivered').length || 0}`,
        `In Transit: ${loads?.filter(l => l.status === 'in_transit').length || 0}`,
        `Pending: ${loads?.filter(l => l.status === 'pending').length || 0}`
      ]
    },
    {
      id: "financial",
      title: "Financial Report",
      description: "Revenue analysis, invoice status, and payment tracking",
      icon: TrendingUp,
      metrics: [
        `Total Invoices: ${invoices?.length || 0}`,
        `Paid: ${invoices?.filter(i => i.status === 'paid').length || 0}`,
        `Pending: ${invoices?.filter(i => i.status === 'pending').length || 0}`,
        `Total Revenue: $${invoices?.reduce((sum, i) => sum + (i.total_amount || 0), 0).toLocaleString() || 0}`
      ]
    },
    {
      id: "fleet",
      title: "Fleet Report",
      description: "Vehicle utilization, maintenance schedules, and driver assignments",
      icon: FileText,
      metrics: [
        `Total Vehicles: ${vehicles?.length || 0}`,
        `Active: ${vehicles?.filter(v => v.status === 'active').length || 0}`,
        `Total Drivers: ${drivers?.length || 0}`,
        `Active Drivers: ${drivers?.filter(d => d.is_active).length || 0}`
      ]
    },
    {
      id: "performance",
      title: "Performance Report",
      description: "KPIs, delivery times, and operational efficiency metrics",
      icon: BarChart3,
      metrics: [
        `On-Time Delivery: 95%`,
        `Avg. Load Value: $2,500`,
        `Customer Satisfaction: 4.8/5`,
        `Fleet Utilization: 87%`
      ]
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Generate detailed reports and analyze business performance</p>
        </div>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Export All
        </Button>
      </div>

      {/* Quick Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="date-from">From Date</Label>
              <Input
                id="date-from"
                type="date"
                defaultValue={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to">To Date</Label>
              <Input
                id="date-to"
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="All Reports" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reports</SelectItem>
                  <SelectItem value="loads">Loads</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                  <SelectItem value="fleet">Fleet</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="format">Export Format</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="PDF" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button>
              <BarChart3 className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Types */}
      <div className="grid gap-6 md:grid-cols-2">
        {reportTypes.map((report) => {
          const Icon = report.icon
          return (
            <Card key={report.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{report.title}</h3>
                    <p className="text-sm text-muted-foreground font-normal">{report.description}</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.metrics.map((metric, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-border/50 last:border-b-0">
                      <span className="text-sm text-muted-foreground">{metric.split(':')[0]}:</span>
                      <span className="text-sm font-medium">{metric.split(':')[1]}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-6">
                  <Button size="sm" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Generate
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: "Monthly Fleet Report - November 2024", date: "Nov 30, 2024", type: "Fleet", size: "2.3 MB" },
              { name: "Q4 Financial Summary", date: "Nov 28, 2024", type: "Financial", size: "1.8 MB" },
              { name: "Weekly Performance Report", date: "Nov 25, 2024", type: "Performance", size: "856 KB" },
              { name: "Loads Analysis - November", date: "Nov 20, 2024", type: "Loads", size: "3.1 MB" }
            ].map((report, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium">{report.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {report.type} • {report.date} • {report.size}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}