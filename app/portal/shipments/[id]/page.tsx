"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/lib/hooks/use-user"
import { ArrowLeft, MapPin, Calendar, Package, Truck, FileText, Clock, DollarSign } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import type { Load } from "@/lib/types/database"

interface ShipmentDetailPageProps {
  params: {
    id: string
  }
}

export default function ShipmentDetailPage({ params }: ShipmentDetailPageProps) {
  const { user, loading } = useUser()
  const router = useRouter()
  const [shipment, setShipment] = useState<Load | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchShipment = async () => {
      if (!user?.customer_id) return

      const supabase = createClient()

      try {
        const { data, error } = await supabase
          .from("loads")
          .select("*")
          .eq("id", params.id)
          .eq("customer_id", user.customer_id)
          .single()

        if (error) {
          setError("Shipment not found or access denied")
          return
        }

        setShipment(data)
      } catch (err) {
        setError("Failed to load shipment details")
      } finally {
        setIsLoading(false)
      }
    }

    fetchShipment()
  }, [user, params.id])

  if (loading || isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  if (!user || user.role !== "customer") {
    router.push("/auth/login")
    return null
  }

  if (error || !shipment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/portal/shipments">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Shipments
              </Button>
            </Link>
          </div>
          <Card className="border-0 shadow-md bg-white">
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Shipment Not Found</h3>
              <p className="text-slate-600">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
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
          <Link href="/portal/shipments">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Shipments
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-slate-900">{shipment.load_number}</h1>
            <p className="text-slate-600">Shipment Details</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status and Overview */}
            <Card className="border-0 shadow-md bg-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold text-slate-900">Shipment Overview</CardTitle>
                  <Badge className={getStatusColor(shipment.status)}>
                    {shipment.status.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Pickup Location</h4>
                    <div className="flex items-start gap-2 text-slate-600">
                      <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                      <div>
                        <p>{shipment.pickup_address}</p>
                        <p>
                          {shipment.pickup_city}{shipment.pickup_state ? `, ${shipment.pickup_state}` : ''}
                        </p>
                        <p className="text-sm">Date: {shipment.pickup_date ? new Date(shipment.pickup_date).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Delivery Location</h4>
                    <div className="flex items-start gap-2 text-slate-600">
                      <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                      <div>
                        <p>{shipment.delivery_address}</p>
                        <p>
                          {shipment.delivery_city}{shipment.delivery_state ? `, ${shipment.delivery_state}` : ''}
                        </p>
                        <p className="text-sm">Date: {shipment.delivery_date ? new Date(shipment.delivery_date).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cargo Details */}
            <Card className="border-0 shadow-md bg-white">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-slate-900">Cargo Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-1">Cargo Type</h4>
                    <p className="text-slate-600">{shipment.cargo_type || shipment.description || 'N/A'}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-1">Weight</h4>
                    <p className="text-slate-600">{shipment.weight || shipment.weight_kg || 0} kg</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-1">Distance</h4>
                    <p className="text-slate-600">{shipment.distance ? `${shipment.distance} km` : 'N/A'}</p>
                  </div>
                </div>
                {shipment.special_instructions && (
                  <div className="mt-4">
                    <h4 className="font-medium text-slate-900 mb-1">Special Instructions</h4>
                    <p className="text-slate-600">{shipment.special_instructions}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="border-0 shadow-md bg-white">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-slate-900">Shipment Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Shipment Created</p>
                      <p className="text-sm text-slate-600">{new Date(shipment.created_at).toLocaleString()}</p>
                    </div>
                  </div>

                  {shipment.status !== "pending" && (
                    <div className="flex items-center gap-4">
                      <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Truck className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">In Transit</p>
                        <p className="text-sm text-slate-600">Shipment is on the way</p>
                      </div>
                    </div>
                  )}

                  {shipment.status === "delivered" && (
                    <div className="flex items-center gap-4">
                      <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Package className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Delivered</p>
                        <p className="text-sm text-slate-600">Shipment successfully delivered</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing */}
            <Card className="border-0 shadow-md bg-white">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-slate-900">Pricing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Base Rate:</span>
                    <span className="font-medium">${(shipment.rate ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Currency:</span>
                    <span className="font-medium">{shipment.currency}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-900">Total:</span>
                      <span className="font-bold text-lg">
                        ${(shipment.rate ?? 0).toFixed(2)} {shipment.currency}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-0 shadow-md bg-white">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-slate-900">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <FileText className="h-4 w-4 mr-2" />
                  Download Documents
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <DollarSign className="h-4 w-4 mr-2" />
                  View Invoice
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Clock className="h-4 w-4 mr-2" />
                  Track Live Location
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
