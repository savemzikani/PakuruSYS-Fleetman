import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const payloadSchema = z.object({
  loadId: z.string().uuid(),
  status: z.string().min(1),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  location: z.string().max(255).optional(),
  notes: z.string().max(512).optional(),
  timestamp: z.string().datetime().optional(),
})

export async function POST(request: Request) {
  const apiKeyHeader = request.headers.get("x-api-key")
  const expectedApiKey = process.env.TRACKING_INGEST_API_KEY

  if (!expectedApiKey) {
    console.error("[tracking] TRACKING_INGEST_API_KEY missing from environment")
    return NextResponse.json({ error: "Tracking ingest not configured" }, { status: 500 })
  }

  if (!apiKeyHeader || apiKeyHeader !== expectedApiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let payload: z.infer<typeof payloadSchema>

  try {
    const json = await request.json()
    payload = payloadSchema.parse(json)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", issues: error.issues }, { status: 422 })
    }

    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: load, error: loadError } = await supabase
    .from("loads")
    .select("id, company_id")
    .eq("id", payload.loadId)
    .single()

  if (loadError || !load) {
    return NextResponse.json({ error: "Load not found" }, { status: 404 })
  }

  const insertResult = await supabase.from("load_tracking").insert({
    load_id: payload.loadId,
    status: payload.status,
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    location: payload.location,
    notes: payload.notes,
    created_at: payload.timestamp ?? new Date().toISOString(),
  })

  if (insertResult.error) {
    console.error("[tracking] Failed to ingest telemetry", insertResult.error)
    return NextResponse.json({ error: "Failed to persist telemetry" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
