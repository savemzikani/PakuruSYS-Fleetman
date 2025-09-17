import { NextResponse } from "next/server"
import { acceptQuote } from "@/lib/actions/quotes"

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const result = await acceptQuote(params.id)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true, message: result.message })
}


