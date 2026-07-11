import { NextResponse, type NextRequest } from 'next/server'
import { requireUser } from '@/middleware/auth'
import { deleteDumpForUser, getDumpForUser, updateDumpForUser } from '@/services/dumps.service'
import { jsonOk, toErrorResponse } from '@/lib/http'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/v1/dumps/[id] — Auth: required — Returns: Dump
export async function GET(_req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const { id } = await params
    const { supabase, user } = await requireUser()
    const dump = await getDumpForUser(supabase, user.id, id)
    return jsonOk(dump)
  } catch (error) {
    return toErrorResponse(error)
  }
}

// PATCH /api/v1/dumps/[id] — Auth: required — Body: { title?, tags?, is_pinned? } — Returns: Dump
export async function PATCH(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const { id } = await params
    const { supabase, user } = await requireUser()
    const body: unknown = await req.json().catch(() => ({}))
    const dump = await updateDumpForUser(supabase, user.id, id, body)
    return jsonOk(dump)
  } catch (error) {
    return toErrorResponse(error)
  }
}

// DELETE /api/v1/dumps/[id] — Auth: required — Returns: { success: true }
export async function DELETE(_req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const { id } = await params
    const { supabase, user } = await requireUser()
    await deleteDumpForUser(supabase, user.id, id)
    return jsonOk({ success: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
