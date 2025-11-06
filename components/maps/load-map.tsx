"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import "mapbox-gl/dist/mapbox-gl.css"
import type { LayerProps, ViewState, ViewStateChangeEvent } from "react-map-gl"
import type { Feature, FeatureCollection, LineString, Point } from "geojson"
import type { TrackingPoint } from "@/lib/types/tracking"
import { Card } from "@/components/ui/card"

const Map = dynamic(() => import("react-map-gl").then((mod) => mod.Map), { ssr: false })
const Marker = dynamic(() => import("react-map-gl").then((mod) => mod.Marker), { ssr: false })
const NavigationControl = dynamic(() => import("react-map-gl").then((mod) => mod.NavigationControl), { ssr: false })
const Source = dynamic(() => import("react-map-gl").then((mod) => mod.Source), { ssr: false })
const Layer = dynamic(() => import("react-map-gl").then((mod) => mod.Layer), { ssr: false })

interface LoadMapProps {
  points: TrackingPoint[]
  height?: number
}

const fallbackViewState = {
  longitude: 28.0473,
  latitude: -26.2041,
  zoom: 4.5,
}

export function LoadMap({ points, height = 360 }: LoadMapProps) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

  const latestPoint = useMemo(
    () => points.slice().reverse().find((point) => point.latitude !== null && point.longitude !== null),
    [points],
  )

  const validPoints = useMemo(
    () => points.filter((point) => point.latitude !== null && point.longitude !== null),
    [points],
  )

  const routeGeoJson = useMemo<FeatureCollection<LineString> | null>(() => {
    if (validPoints.length < 2) {
      return null
    }

    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: validPoints.map((point) => [point.longitude as number, point.latitude as number]),
          },
          properties: {},
        },
      ],
    }
  }, [validPoints])

  const breadcrumbGeoJson = useMemo<FeatureCollection<Point> | null>(() => {
    if (validPoints.length === 0) {
      return null
    }

    return {
      type: "FeatureCollection",
      features: validPoints.map<Feature<Point>>((point) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [point.longitude as number, point.latitude as number],
        },
        properties: {
          status: point.status,
        },
      })),
    }
  }, [validPoints])

  const [viewState, setViewState] = useState<ViewState>(() => {
    if (latestPoint && latestPoint.longitude !== null && latestPoint.latitude !== null) {
      return {
        longitude: latestPoint.longitude,
        latitude: latestPoint.latitude,
        zoom: 8,
      }
    }

    return fallbackViewState
  })

  if (!mapboxToken) {
    return (
      <Card className="flex h-full min-h-[240px] items-center justify-center">
        <p className="text-sm text-muted-foreground">Configure NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to view the live map.</p>
      </Card>
    )
  }

  if (!latestPoint || latestPoint.longitude === null || latestPoint.latitude === null) {
    return (
      <Card className="flex h-full min-h-[240px] items-center justify-center">
        <p className="text-sm text-muted-foreground">No tracking coordinates available yet.</p>
      </Card>
    )
  }

  return (
    <div className="relative w-full overflow-hidden rounded-lg" style={{ height }}>
      <Map
        mapboxAccessToken={mapboxToken}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        {...viewState}
        onMove={(event: ViewStateChangeEvent) => setViewState(event.viewState)}
      >
        {routeGeoJson && (
          <Source id="load-route" type="geojson" data={routeGeoJson}>
            <Layer
              id="load-route-line"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" } satisfies LayerProps["layout"] }
              paint={{
                "line-color": "#2563eb",
                "line-width": 4,
                "line-opacity": 0.4,
              }}
            />
          </Source>
        )}
        {breadcrumbGeoJson && (
          <Source id="load-breadcrumbs" type="geojson" data={breadcrumbGeoJson}>
            <Layer
              id="load-breadcrumb-points"
              type="circle"
              paint={{
                "circle-radius": 4,
                "circle-color": "#1d4ed8",
                "circle-stroke-color": "#eff6ff",
                "circle-stroke-width": 1,
                "circle-opacity": 0.6,
              }}
            />
          </Source>
        )}
        <Marker
          longitude={latestPoint.longitude}
          latitude={latestPoint.latitude}
          anchor="bottom"
          color="#2563eb"
        />
        <div className="absolute right-3 top-3">
          <NavigationControl visualizePitch={true} />
        </div>
      </Map>
    </div>
  )
}
