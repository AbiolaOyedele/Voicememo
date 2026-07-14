import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase'

// GET /callback — completes sign-in for both auth flows and then redirects to
// `next` (default /record):
//   • Email magic link / OTP → { token_hash, type, next? }  → verifyOtp
//   • Google OAuth (PKCE)     → { code, next? }              → exchangeCodeForSession
//
// The email template must point here with token_hash + type (see the auth email
// templates in the Supabase dashboard), NOT the default `{{ .ConfirmationURL }}`,
// which returns tokens in the URL hash fragment that a server route cannot read.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const nextParam = searchParams.get('next') ?? '/record'

  // Prevent open redirects: only allow same-origin relative paths.
  const safeNext = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/record'

  const supabase = await createServerSupabaseClient()

  // Email magic link / OTP flow.
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) return finishSignedIn(origin, safeNext)
  }

  // Google OAuth (PKCE) flow.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return finishSignedIn(origin, safeNext)
  }

  // Missing/invalid params or verification failed — send the user back to sign in.
  return NextResponse.redirect(`${origin}/login?error=auth`)
}

/**
 * Redirect into the app now that a real session exists. Drops the guest cookie so
 * the app stops treating this session as a guest (local guest recordings are
 * migrated client-side).
 */
function finishSignedIn(origin: string, safeNext: string): NextResponse {
  const response = NextResponse.redirect(`${origin}${safeNext}`)
  response.cookies.delete('dumpty_guest')
  return response
}
