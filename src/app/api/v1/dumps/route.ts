import { NextResponse } from 'next/server'
import { requireUser } from '@/middleware/auth'
import { listDumpsForUser } from '@/services/dumps.service'
import { jsonOk, toErrorResponse } from '@/lib/http'

// GET /api/v1/dumps
// Auth: required
// Returns: Dump[] (the current user's dumps, pinned first then newest)
//
// Dump creation lives in POST /api/v1/upload (it needs the R2 key + duration
// together), so this collection is read-only.
export async function GET(): Promise<NextResponse> {
  try {
    const { supabase, user } = await requireUser()
    const dumps = await listDumpsForUser(supabase, user.id)
    return jsonOk(dumps)
  } catch (error) {
    return toErrorResponse(error)
  }
}
