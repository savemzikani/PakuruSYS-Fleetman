"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/lib/hooks/use-user"
import { Package, FileText, CreditCard, MapPin, Clock, DollarSign, Truck } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import type { Load, Invoice } from "@/lib/types/database"

interface DashboardStats {
  activeShipments: number
  completedShipments: number
  pendingInvoices: number
  totalSpent: number
}

export default function CustomerPortalPage() {
  const { user, loading } = useUser()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    activeShipments: 0,
    completedShipments: 0,
    pendingInvoices: 0,
    totalSpent: 0,
  })
  const [recentShipments, setRecentShipments] = useState<Load[]>([])
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.customer_id) return

      const supabase = createClient()

      try {
        // Fetch loads for this customer
        const { data: loads } = await supabase
          .from("loads")
          .select("*")
          .eq("customer_id", user.customer_id)
          .order("created_at", { ascending: false })
          .limit(5)

        // Fetch invoices for this customer
        const { data: invoices } = await supabase
          .from("invoices")
          .select("*")
          .eq("customer_id", user.customer_id)
          .order("created_at", { ascending: false })
          .limit(5)

        if (loads) {
          setRecentShipments(loads)
          const activeCount = loads.filter((load) => ["pending", "in_transit", "loading"].includes(load.status)).length
          const completedCount = loads.filter((load) => load.status === "delivered").length

          setStats((prev) => ({
            ...prev,
            activeShipments: activeCount,
            completedShipments: completedCount,
          }))
        }

        if (invoices) {
          setRecentInvoices(invoices)
          const pendingCount = invoices.filter((invoice) => invoice.status === "pending").length
          const totalSpent = invoices
            .filter((invoice) => invoice.status === "paid")
            .reduce((sum, invoice) => sum + invoice.total_amount, 0)

          setStats((prev) => ({
            ...prev,
            pendingInvoices: pendingCount,
            totalSpent,
          }))
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [user])

  if (loading || isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  if (!user || user.role !== "customer") {
    router.push("/auth/login")
    return null
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "in_transit":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "delivered":
        return "bg-green-100 text-green-800 border-green-200"
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200"
      case "paid":
        return "bg-green-100 text-green-800 border-green-200"
      case "overdue":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Customer Portal</h1>
          <p className="text-slate-600">Track your shipments, view invoices, and manage your account</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="border-0 shadow-md bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Shipments</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.activeShipments}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Truck className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Completed</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.completedShipments}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Pending Invoices</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.pendingInvoices}</p>
                </div>
                <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Spent</p>
                  <p className="text-3xl font-bold text-slate-900">${stats.totalSpent.toLocaleString()}</p>
                </div>
                <div className="h-12 w-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-cyan-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Recent Shipments */}
          <Card className="border-0 shadow-md bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-semibold text-slate-900">Recent Shipments</CardTitle>
              <Link href="/portal/shipments">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentShipments.length > 0 ? (
                  recentShipments.map((shipment) => (
                    <div
                      key={shipment.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Package className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{shipment.load_number}</p>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <MapPin className="h-4 w-4" />
                            <span>
                              {shipment.pickup_city} → {shipment.delivery_city}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(shipment.status)}>
                          {shipment.status.replace("_", " ").toUpperCase()}
                        </Badge>
                        <p className="text-sm text-slate-600 mt-1">
                          {new Date(shipment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Package className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p>No shipments found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card className="border-0 shadow-md bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-semibold text-slate-900">Recent Invoices</CardTitle>
              <Link href="/portal/invoices">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentInvoices.length > 0 ? (
                  recentInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <FileText className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{invoice.invoice_number}</p>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Clock className="h-4 w-4" />
                            <span>Due: {new Date(invoice.due_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">
                          ${invoice.total_amount.toFixed(2)} {invoice.currency}
                        </p>
                        <Badge className={getStatusColor(invoice.status)}>{invoice.status.toUpperCase()}</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p>No invoices found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="border-0 shadow-md bg-white mt-8">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Link href="/portal/shipments/track">
                <Button variant="outline" className="w-full h-16 flex flex-col gap-2 bg-transparent">
                  <MapPin className="h-5 w-5" />
                  <span>Track Shipment</span>
                </Button>
              </Link>
              <Link href="/portal/invoices">
                <Button variant="outline" className="w-full h-16 flex flex-col gap-2 bg-transparent">
                  <FileText className="h-5 w-5" />
                  <span>View Invoices</span>
                </Button>
              </Link>
              <Link href="/portal/profile">
                <Button variant="outline" className="w-full h-16 flex flex-col gap-2 bg-transparent">
                  <CreditCard className="h-5 w-5" />
                  <span>Account Settings</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
