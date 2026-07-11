import { NextResponse } from 'next/server'

// GET  /api/v1/dumps  — Auth: required — Returns: Dump[]
// POST /api/v1/dumps  — Auth: required — Body: { duration_seconds: number } — Returns: Dump

const notImplemented = (): NextResponse =>
  NextResponse.json(
    { error: { code: 'NOT_IMPLEMENTED', message: 'This endpoint is not available yet.' } },
    { status: 501 },
  )

/** GET /api/v1/dumps — list the current user's dumps. Implemented in Step 17. */
export async function GET(): Promise<NextResponse> {
  return notImplemented()
}

/** POST /api/v1/dumps — create a dump. Implemented in Step 17. */
export async function POST(): Promise<NextResponse> {
  return notImplemented()
}
