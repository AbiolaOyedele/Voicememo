// POST /api/v1/process — Auth: required — Body: { dumpId } — Returns: Dump
import { NextResponse } from 'next/server'

/**
 * POST /api/v1/process — Claude cleanup + segmentation
 * Placeholder — implemented in Build Order Step 16.
 */
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { error: { code: 'NOT_IMPLEMENTED', message: 'This endpoint is not available yet.' } },
    { status: 501 },
  )
}
