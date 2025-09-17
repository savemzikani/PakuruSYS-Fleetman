import { NextResponse } from "next/server"
import { createExpense } from "@/lib/actions/expenses"

export async function POST(request: Request) {
  const form = await request.formData()
  const result = await createExpense(form)
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true, data: result.data })
}


