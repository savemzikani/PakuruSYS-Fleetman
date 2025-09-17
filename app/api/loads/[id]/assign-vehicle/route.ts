import { NextResponse } from "next/server"
import { assignVehicleToLoad } from "@/lib/actions/loads"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { vehicleId } = await request.json()
    const result = await assignVehicleToLoad(params.id, vehicleId)
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 400 })
  }
}


