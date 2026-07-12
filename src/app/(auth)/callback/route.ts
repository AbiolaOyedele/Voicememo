import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// GET /callback — Supabase Google OAuth callback.
// Query: { code: string, next?: string }
// Exchanges the auth code for a session, then redirects to `next` (default /record).
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/record'

  // Prevent open redirects: only allow same-origin relative paths.
  const safeNext = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/record'

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Now a real account: drop the guest cookie so the app stops treating this
      // session as a guest. Local guest recordings are migrated client-side.
      const response = NextResponse.redirect(`${origin}${safeNext}`)
      response.cookies.delete('dumpty_guest')
      return response
    }
  }

  // Missing code or exchange failed — send the user back to sign in.
  return NextResponse.redirect(`${origin}/login?error=auth`)
}
