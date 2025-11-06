"use client"

import { useMemo } from "react"
import { Loader2, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadMap } from "@/components/maps/load-map"
import type { LoadSummary, TrackingPoint } from "@/lib/types/tracking"
import { useLoadTracking } from "@/lib/hooks/use-load-tracking"

interface LoadTrackingViewerProps {
  loadId: string
  initialLoad: LoadSummary
  initialPoints: TrackingPoint[]
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

export function LoadTrackingViewer({ loadId, initialLoad, initialPoints }: LoadTrackingViewerProps) {
  const { load, points, loading, error } = useLoadTracking({ loadId, initialLoad, initialPoints })

  const orderedPoints = useMemo(() => points.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [points])
  const latestUpdate = orderedPoints[orderedPoints.length - 1]

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-red-500">Failed to load tracking data.</CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card className="order-2 lg:order-1">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xl">Live Location</CardTitle>
            <p className="text-sm text-muted-foreground">
              {latestUpdate ? `Last updated ${new Date(latestUpdate.createdAt).toLocaleString()}` : "Awaiting first GPS ping"}
            </p>
          </div>
          <Badge className={getStatusColor((load ?? initialLoad).status)} variant="secondary">
            {(load ?? initialLoad).status.replace("_", " ")}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <LoadMap points={orderedPoints} />
          {loading && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Syncing latest telemetry...
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="order-1 lg:order-2">
        <CardHeader>
          <CardTitle className="text-xl">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orderedPoints.length === 0 && <p className="text-sm text-muted-foreground">No tracking events yet.</p>}
            {orderedPoints
              .slice()
              .reverse()
              .map((event, index) => (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center pt-1">
                    <div className={`h-2 w-2 rounded-full ${index === 0 ? "bg-primary" : "bg-muted-foreground/40"}`} />
                    {index < orderedPoints.length - 1 && <div className="mt-1 h-10 w-px bg-muted-foreground/40" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge className={getStatusColor(event.status)} variant="secondary">
                        {event.status.replace("_", " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {event.location && (
                      <p className="mb-1 text-sm font-medium">
                        <MapPin className="mr-1 inline h-4 w-4" />
                        {event.location}
                      </p>
                    )}
                    {event.notes && <p className="text-sm text-muted-foreground">{event.notes}</p>}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
