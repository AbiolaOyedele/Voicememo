import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { publicEnv } from '@/config/env'

/**
 * Refreshes the Supabase auth session on every matched request and forwards the
 * updated auth cookies, keeping server-side `getUser()` calls authoritative.
 *
 * NOTE: Route-protection redirects (signed-out → /login) are intentionally
 * disabled for now so the app can be browsed without a live Supabase session.
 * The full gating logic is preserved in git history (commit fa4e602) and will be
 * restored once real auth credentials are wired up. Server data access is still
 * re-checked in each route handler via requireUser().
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  // Refresh the session cookie when needed. No gating here for now.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and files:
     * - _next/static, _next/image
     * - favicon, manifest, icons
     * - common image/font extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)',
  ],
}
