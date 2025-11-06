"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import type { TrackingPoint, LoadSummary } from "@/lib/types/tracking"

interface UseLoadTrackingOptions {
  loadId: string
  initialLoad?: LoadSummary
  initialPoints?: TrackingPoint[]
}

interface UseLoadTrackingState {
  load?: LoadSummary
  points: TrackingPoint[]
  loading: boolean
  error?: string
}

interface TrackingRow {
  id: string
  status: string
  latitude: number | null
  longitude: number | null
  location?: string | null
  notes?: string | null
  created_at: string
}

const fetchTracking = async (loadId: string): Promise<{ load: LoadSummary; tracking: TrackingPoint[] }> => {
  const response = await fetch(`/api/tracking/${loadId}`)

  if (!response.ok) {
    throw new Error("Failed to fetch tracking data")
  }

  const payload = await response.json()
  return {
    load: payload.load as LoadSummary,
    tracking: (payload.tracking as TrackingPoint[]).map((point) => ({
      ...point,
      latitude: point.latitude ?? null,
      longitude: point.longitude ?? null,
    })),
  }
}

export function useLoadTracking({ loadId, initialLoad, initialPoints }: UseLoadTrackingOptions): UseLoadTrackingState {
  const [state, setState] = useState<UseLoadTrackingState>({
    load: initialLoad,
    points: initialPoints ?? [],
    loading: !initialLoad,
  })
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null)

  const synchronize = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true }))
      const data = await fetchTracking(loadId)
      setState({ load: data.load, points: data.tracking, loading: false })
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: (error as Error).message }))
    }
  }, [loadId])

  useEffect(() => {
    synchronize()
  }, [synchronize])

  useEffect(() => {
    supabaseRef.current = createClient()

    const supabase = supabaseRef.current
    const channel = supabase
      .channel(`load-tracking:${loadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "load_tracking",
          filter: `load_id=eq.${loadId}`,
        },
        (payload: RealtimePostgresChangesPayload<TrackingRow>) => {
          const rawRow = payload.new

          if (!rawRow) {
            return
          }

          const newRow = rawRow as TrackingRow

          setState((prev) => ({
            ...prev,
            points: [
              ...prev.points,
              {
                id: newRow.id,
                status: newRow.status,
                latitude: newRow.latitude ?? null,
                longitude: newRow.longitude ?? null,
                location: newRow.location ?? undefined,
                notes: newRow.notes ?? undefined,
                createdAt: newRow.created_at,
              },
            ],
          }))
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      const client = supabaseRef.current
      if (client && channelRef.current) {
        client.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [loadId, synchronize])

  return state
}
