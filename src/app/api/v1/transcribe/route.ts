// POST /api/v1/transcribe — Auth: required — Body: { dumpId } — Returns: { status }
import { NextResponse } from 'next/server'

/**
 * POST /api/v1/transcribe — run Deepgram on a stored R2 object
 * Placeholder — implemented in Build Order Step 15.
 */
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { error: { code: 'NOT_IMPLEMENTED', message: 'This endpoint is not available yet.' } },
    { status: 501 },
  )
}
