// POST /api/v1/sync — Auth: required — Body: QueuedRecording[] — Returns: { accepted }
import { NextResponse } from 'next/server'

/**
 * POST /api/v1/sync — accept queued offline recordings
 * Placeholder — implemented in Build Order Step 13.
 */
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { error: { code: 'NOT_IMPLEMENTED', message: 'This endpoint is not available yet.' } },
    { status: 501 },
  )
}
