import { NextResponse } from "next/server"
import { assignDriverToLoad } from "@/lib/actions/drivers"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { driverId } = await request.json()
    const result = await assignDriverToLoad(driverId, params.id)
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 400 })
  }
}


