// POST /api/v1/upload — Auth: required — Body: { duration_seconds, content_type } — Returns: { uploadUrl, key }
import { NextResponse } from 'next/server'

/**
 * POST /api/v1/upload — generate an R2 presigned upload URL (rejects >900s)
 * Placeholder — implemented in Build Order Step 14.
 */
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { error: { code: 'NOT_IMPLEMENTED', message: 'This endpoint is not available yet.' } },
    { status: 501 },
  )
}
