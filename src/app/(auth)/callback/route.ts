import { NextResponse } from 'next/server'

/**
 * GET /callback — Supabase Google OAuth callback handler.
 * Placeholder — session exchange implemented in Step 7.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { error: { code: 'NOT_IMPLEMENTED', message: 'Sign-in is not available yet.' } },
    { status: 501 },
  )
}
