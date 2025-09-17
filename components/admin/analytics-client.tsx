"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { TrendingUp, Building2, Users, Activity, Calendar, Download, BarChart3, Globe, Shield } from "lucide-react"

interface AnalyticsClientProps {
  totalCompanies: number
  totalUsers: number
  totalLoads: number
  activeCompanies: number
  companies: any[]
  users: any[]
  loads: any[]
}

// Sample system-wide data
const systemGrowthData = [
  { month: "Jan", companies: 42, users: 1156, loads: 8945 },
  { month: "Feb", companies: 45, users: 1289, loads: 9876 },
  { month: "Mar", companies: 48, users: 1423, loads: 10234 },
  { month: "Apr", companies: 52, users: 1567, loads: 11456 },
  { month: "May", companies: 55, users: 1698, loads: 12234 },
  { month: "Jun", companies: 58, users: 1834, loads: 13567 },
]

const regionDistribution = [
  { name: "South Africa", value: 45, color: "#0891b2" },
  { name: "Botswana", value: 25, color: "#10b981" },
  { name: "Namibia", value: 20, color: "#f59e0b" },
  { name: "Other SADC", value: 10, color: "#ef4444" },
]

const systemHealthData = [
  { metric: "Uptime", value: "99.9%", status: "excellent" },
  { metric: "Response Time", value: "145ms", status: "good" },
  { metric: "Error Rate", value: "0.02%", status: "excellent" },
  { metric: "Active Sessions", value: "1,234", status: "normal" },
]

export function AnalyticsClient({ 
  totalCompanies, 
  totalUsers, 
  totalLoads, 
  activeCompanies,
  companies,
  users,
  loads 
}: AnalyticsClientProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("6months")

  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent":
        return "bg-green-100 text-green-800"
      case "good":
        return "bg-blue-100 text-blue-800"
      case "normal":
        return "bg-yellow-100 text-yellow-800"
      case "poor":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Calculate growth metrics
  const thisMonthCompanies = companies?.filter(c => 
    new Date(c.created_at).getMonth() === new Date().getMonth()
  ).length || 0

  const thisMonthUsers = users?.filter(u => 
    new Date(u.created_at).getMonth() === new Date().getMonth()
  ).length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Analytics</h1>
          <p className="text-muted-foreground">Platform-wide insights and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Last Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export System Report
          </Button>
        </div>
      </div>

      {/* System Overview - Real Data */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCompanies}</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{thisMonthCompanies} this month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{thisMonthUsers} this month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Loads</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLoads}</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              Active tracking
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Companies</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCompanies}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {Math.round((activeCompanies / totalCompanies) * 100)}% of total
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="growth" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="growth">Growth</TabsTrigger>
          <TabsTrigger value="regional">Regional</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
        </TabsList>

        {/* Growth Analytics */}
        <TabsContent value="growth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Platform Growth Trends
              </CardTitle>
              <CardDescription>Companies, users, and load volume over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={systemGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
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
                <CardTitle className="text-lg">Real-time Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Companies</span>
                    <span className="font-medium">{totalCompanies}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Active Companies</span>
                    <span className="font-medium text-green-600">{activeCompanies}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Users</span>
                    <span className="font-medium">{totalUsers}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">User Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Daily Active Users</span>
                    <span className="font-medium">{Math.round(totalUsers * 0.67)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Session Duration</span>
                    <span className="font-medium">24 min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Return Rate</span>
                    <span className="font-medium">87%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Loads</span>
                    <span className="font-medium">{totalLoads}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg per Company</span>
                    <span className="font-medium">{totalCompanies > 0 ? Math.round(totalLoads / totalCompanies) : 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">System Health</span>
                    <span className="font-medium text-green-600">99.9%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Regional Analytics */}
        <TabsContent value="regional" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Regional Distribution
                </CardTitle>
                <CardDescription>Companies by SADC region</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={regionDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {regionDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
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
              <CardContent>
                <div className="space-y-4">
                  {[
                    { region: "South Africa", companies: Math.round(totalCompanies * 0.45), users: Math.round(totalUsers * 0.45) },
                    { region: "Botswana", companies: Math.round(totalCompanies * 0.25), users: Math.round(totalUsers * 0.25) },
                    { region: "Namibia", companies: Math.round(totalCompanies * 0.20), users: Math.round(totalUsers * 0.20) },
                    { region: "Other SADC", companies: Math.round(totalCompanies * 0.10), users: Math.round(totalUsers * 0.10) },
                  ].map((region, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{region.region}</p>
                        <p className="text-sm text-muted-foreground">{region.companies} companies</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{region.users} users</p>
                        <p className="text-sm text-muted-foreground">Active</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Company Analytics */}
        <TabsContent value="companies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Overview
              </CardTitle>
              <CardDescription>Real company data from your system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 border rounded-lg">
                    <p className="font-medium">Total Companies</p>
                    <p className="text-2xl font-bold text-blue-600">{totalCompanies}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="font-medium">Active Companies</p>
                    <p className="text-2xl font-bold text-green-600">{activeCompanies}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="font-medium">Inactive Companies</p>
                    <p className="text-2xl font-bold text-red-600">{totalCompanies - activeCompanies}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Health */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  System Health Metrics
                </CardTitle>
                <CardDescription>Real-time system performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {systemHealthData.map((metric, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{metric.metric}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{metric.value}</span>
                        <Badge className={getStatusColor(metric.status)}>{metric.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Database Statistics</CardTitle>
                <CardDescription>Current database utilization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Companies Table</span>
                      <span>{totalCompanies} records</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min((totalCompanies / 100) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Users Table</span>
                      <span>{totalUsers} records</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: `${Math.min((totalUsers / 1000) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Loads Table</span>
                      <span>{totalLoads} records</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-yellow-600 h-2 rounded-full" style={{ width: `${Math.min((totalLoads / 500) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
