"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/lib/hooks/use-user"
import { ArrowLeft, Search, MapPin, Calendar, Package, Eye } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import type { Load } from "@/lib/types/database"

export default function CustomerShipmentsPage() {
  const { user, loading } = useUser()
  const router = useRouter()
  const [shipments, setShipments] = useState<Load[]>([])
  const [filteredShipments, setFilteredShipments] = useState<Load[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    const fetchShipments = async () => {
      if (!user?.customer_id) return

      const supabase = createClient()

      try {
        const { data } = await supabase
          .from("loads")
          .select("*")
          .eq("customer_id", user.customer_id)
          .order("created_at", { ascending: false })

        if (data) {
          setShipments(data)
          setFilteredShipments(data)
        }
      } catch (error) {
        console.error("Error fetching shipments:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchShipments()
  }, [user])

  useEffect(() => {
    let filtered = shipments

    if (searchTerm) {
      filtered = filtered.filter(
        (shipment) =>
          shipment.load_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (shipment.pickup_city?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
          (shipment.delivery_city?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((shipment) => shipment.status === statusFilter)
    }

    setFilteredShipments(filtered)
  }, [searchTerm, statusFilter, shipments])

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
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/portal">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Portal
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-slate-900">My Shipments</h1>
            <p className="text-slate-600">Track and manage your shipments</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-md bg-white mb-6">
          <CardContent className="p-6">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder="Search by load number, pickup, or delivery city..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Shipments List */}
        <div className="space-y-4">
          {filteredShipments.length > 0 ? (
            filteredShipments.map((shipment) => (
              <Card key={shipment.id} className="border-0 shadow-md bg-white hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Package className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{shipment.load_number}</h3>
                        <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>
                              {shipment.pickup_city} → {shipment.delivery_city}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Created: {new Date(shipment.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Badge className={getStatusColor(shipment.status)}>
                          {shipment.status.replace("_", " ").toUpperCase()}
                        </Badge>
                        <p className="text-lg font-semibold text-slate-900 mt-1">
                          ${(shipment.rate ?? 0).toFixed(2)} {shipment.currency}
                        </p>
                      </div>
                      <Link href={`/portal/shipments/${shipment.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-0 shadow-md bg-white">
              <CardContent className="p-12 text-center">
                <Package className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No shipments found</h3>
                <p className="text-slate-600">
                  {searchTerm || statusFilter !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : "You don't have any shipments yet"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
