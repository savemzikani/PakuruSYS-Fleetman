import { NextResponse } from "next/server"
import { addLoadTracking } from "@/lib/actions/loads"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const form = await request.formData()
  const result = await addLoadTracking(params.id, form)
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}


