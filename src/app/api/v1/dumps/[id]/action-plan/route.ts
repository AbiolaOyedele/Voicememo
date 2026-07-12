import { NextResponse, type NextRequest } from 'next/server'
import { requireUser } from '@/middleware/auth'
import { enforceRateLimit, RATE_LIMITS } from '@/middleware/rate-limit'
import { generateActionPlan } from '@/services/action-plan.service'
import { jsonOk, toErrorResponse } from '@/lib/http'

type Ctx = { params: Promise<{ id: string }> }

// POST /api/v1/dumps/[id]/action-plan
// Auth: required
// Generates (or regenerates) the action-plan checklist from the dump's
// already-cleaned transcript. Returns: Dump (with `action_plan` populated)
export async function POST(_req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const { id } = await params
    const { supabase, user } = await requireUser()
    enforceRateLimit(`${user.id}:action-plan`, RATE_LIMITS.paid)
    const dump = await generateActionPlan(supabase, user.id, id)
    return jsonOk(dump)
  } catch (error) {
    return toErrorResponse(error)
  }
}
