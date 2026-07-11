import { NextResponse } from 'next/server'

// GET    /api/v1/dumps/[id] — Auth: required — Returns: Dump
// PATCH  /api/v1/dumps/[id] — Auth: required — Body: { title?, tags?, is_pinned? } — Returns: Dump
// DELETE /api/v1/dumps/[id] — Auth: required — Returns: { success: true }

const notImplemented = (): NextResponse =>
  NextResponse.json(
    { error: { code: 'NOT_IMPLEMENTED', message: 'This endpoint is not available yet.' } },
    { status: 501 },
  )

/** GET /api/v1/dumps/[id]. Implemented in Step 17. */
export async function GET(): Promise<NextResponse> {
  return notImplemented()
}

/** PATCH /api/v1/dumps/[id]. Implemented in Step 17. */
export async function PATCH(): Promise<NextResponse> {
  return notImplemented()
}

/** DELETE /api/v1/dumps/[id]. Implemented in Step 17. */
export async function DELETE(): Promise<NextResponse> {
  return notImplemented()
}
