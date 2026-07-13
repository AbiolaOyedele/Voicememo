import { NextResponse, type NextRequest } from 'next/server'
import { requireUser } from '@/middleware/auth'
import { enforceRateLimit, RATE_LIMITS } from '@/middleware/rate-limit'
import { prepareUpload } from '@/services/storage.service'
import { jsonOk, toErrorResponse } from '@/lib/http'

// POST /api/v1/upload
// Auth: required
// Body: { duration_seconds: number, content_type: string, size_bytes: number }
// Returns: { uploadUrl, key, dumpId }
// Rejects recordings longer than 15 minutes, or the object itself too large,
// before they reach R2/Deepgram.
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { supabase, user } = await requireUser()
    enforceRateLimit(`${user.id}:upload`, RATE_LIMITS.paid)
    const body: unknown = await req.json().catch(() => ({}))
    const result = await prepareUpload(supabase, user.id, body)
    return jsonOk(result, 201)
  } catch (error) {
    return toErrorResponse(error)
  }
}
