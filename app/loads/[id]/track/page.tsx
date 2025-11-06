import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, MapPin } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LoadTrackingViewer } from "@/components/loads/load-tracking-viewer"
import type { LoadSummary, TrackingPoint } from "@/lib/types/tracking"

interface LoadTrackPageProps {
  params: Promise<{ id: string }>
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800"
    case "assigned":
      return "bg-blue-100 text-blue-800"
    case "in_transit":
      return "bg-purple-100 text-purple-800"
    case "delivered":
      return "bg-green-100 text-green-800"
    case "cancelled":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export const revalidate = 15

type TrackingRow = {
  id: string
  status: string
  latitude: number | null
  longitude: number | null
  location?: string | null
  notes?: string | null
  created_at: string
}

export default async function LoadTrackPage({ params }: LoadTrackPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, company_id, role")
    .eq("id", authUser.id)
    .single()

  if (!profile?.company_id) {
    redirect("/auth/login")
  }

  if (!["super_admin", "company_admin", "manager", "dispatcher"].includes(profile.role)) {
    redirect("/dashboard")
  }

  const { data: load } = await supabase
    .from("loads")
    .select("id, load_number, status, pickup_city, delivery_city, company_id")
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .single()

  if (!load) {
    redirect("/loads")
  }

  const { data: trackingRows, error: trackingError } = await supabase
    .from("load_tracking")
    .select("id, status, latitude, longitude, location, notes, created_at")
    .eq("load_id", id)
    .order("created_at", { ascending: true })

  if (trackingError) {
    console.error("Failed to load tracking history", trackingError)
  }

  const summary: LoadSummary = {
    id: load.id,
    loadNumber: load.load_number,
    status: load.status,
  }

  const initialPoints: TrackingPoint[] = (trackingRows ?? []).map((row: TrackingRow) => ({
    id: row.id,
    status: row.status,
    latitude: row.latitude !== null ? Number(row.latitude) : null,
    longitude: row.longitude !== null ? Number(row.longitude) : null,
    location: row.location,
    notes: row.notes,
    createdAt: row.created_at,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/loads/${load.id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Load
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Tracking: {load.load_number}</h1>
            <p className="text-sm text-muted-foreground">
              {load.pickup_city || "Unknown"} → {load.delivery_city || "Unknown"}
            </p>
          </div>
        </div>
        <Badge className={getStatusColor(load.status)} variant="secondary">
          {load.status.replace("_", " ")}
        </Badge>
      </div>

      <LoadTrackingViewer loadId={load.id} initialLoad={summary} initialPoints={initialPoints} />

      {initialPoints.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Loader2 className="h-4 w-4 animate-spin" /> Awaiting tracking updates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              No tracking telemetry has been recorded for this load yet. Once the driver or telemetry device submits
              updates, they will appear here automatically.
            </p>
            <p>
              Confirm that the mobile app or GPS integration is configured to send latitude/longitude readings for this
              load.
            </p>
          </CardContent>
        </Card>
      )}

      {trackingError && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-red-500">Telematics data unavailable</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>We could not load historical tracking events. Try refreshing the page to retry the request.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-5 w-5" /> Need another view?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Use the dispatcher mobile tools to push live updates, or integrate your telematics provider via the
            Fleetman API to populate this map automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
