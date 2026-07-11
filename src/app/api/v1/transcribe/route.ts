import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/middleware/auth'
import { transcribeDump } from '@/services/transcription.service'
import { jsonOk, toErrorResponse } from '@/lib/http'
import { AppError } from '@/lib/errors'

const bodySchema = z.object({ dumpId: z.string().uuid() })

// POST /api/v1/transcribe
// Auth: required
// Body: { dumpId: string }
// Returns: { status: 'processing' }
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { supabase, user } = await requireUser()
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
      throw new AppError(422, 'That request was not valid.', 'TRANSCRIBE_INVALID')
    }
    await transcribeDump(supabase, user.id, parsed.data.dumpId)
    return jsonOk({ status: 'processing' })
  } catch (error) {
    return toErrorResponse(error)
  }
}
