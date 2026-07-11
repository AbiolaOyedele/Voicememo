import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/middleware/auth'
import { enforceRateLimit, RATE_LIMITS } from '@/middleware/rate-limit'
import { processDump } from '@/services/ai.service'
import { jsonOk, toErrorResponse } from '@/lib/http'
import { AppError } from '@/lib/errors'

const bodySchema = z.object({ dumpId: z.string().uuid() })

// POST /api/v1/process
// Auth: required
// Body: { dumpId: string }
// Returns: Dump (status 'ready')
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { supabase, user } = await requireUser()
    enforceRateLimit(`${user.id}:process`, RATE_LIMITS.paid)
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
      throw new AppError(422, 'That request was not valid.', 'PROCESS_INVALID')
    }
    const dump = await processDump(supabase, user.id, parsed.data.dumpId)
    return jsonOk(dump)
  } catch (error) {
    return toErrorResponse(error)
  }
}
