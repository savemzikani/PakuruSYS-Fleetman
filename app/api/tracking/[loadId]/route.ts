import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

type TrackingRow = {
  id: string
  status: string
  latitude: number | null
  longitude: number | null
  location?: string | null
  notes?: string | null
  created_at: string
}

const loadIdSchema = z.string().uuid()

export async function GET(request: Request, { params }: { params: { loadId: string } }) {
  const supabase = await createClient()

  try {
    const loadId = loadIdSchema.parse(params.loadId)

    const [{ data: load }, { data: tracking }] = await Promise.all([
      supabase
        .from("loads")
        .select("id, load_number, status, company_id")
        .eq("id", loadId)
        .single(),
      supabase
        .from("load_tracking")
        .select("id, status, latitude, longitude, location, notes, created_at")
        .eq("load_id", loadId)
        .order("created_at", { ascending: true }),
    ])

    if (!load) {
      return NextResponse.json({ error: "Load not found" }, { status: 404 })
    }

    return NextResponse.json(
      {
        load: {
          id: load.id,
          loadNumber: load.load_number,
          status: load.status,
        },
        tracking: (tracking ?? []).map((point: TrackingRow) => ({
          id: point.id,
          status: point.status,
          latitude: point.latitude !== null ? Number(point.latitude) : null,
          longitude: point.longitude !== null ? Number(point.longitude) : null,
          location: point.location,
          notes: point.notes,
          createdAt: point.created_at,
        })),
      },
      {
        headers: {
          "Cache-Control": "private, max-age=15",
        },
      },
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid load id" }, { status: 400 })
    }

    console.error("[tracking] Failed to fetch tracking data", error)
    return NextResponse.json({ error: "Failed to fetch tracking data" }, { status: 500 })
  }
}
