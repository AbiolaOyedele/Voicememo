import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { publicEnv } from '@/config/env'

/** Paths reachable without a session. Everything else (except APIs) needs auth. */
const AUTH_PATHS = ['/login', '/callback']

/**
 * Runs on every matched request. It (1) refreshes the Supabase session and
 * forwards the updated auth cookies, and (2) applies page-level redirects for
 * UX: signed-out users are sent to /login, signed-in users are kept out of the
 * auth pages. API routes are never redirected — they enforce auth themselves and
 * return 401 JSON. Server data access is always re-checked server-side; these
 * redirects are UX only.
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isApi = pathname.startsWith('/api')
  const isAuthPath = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  // Signed-out user hitting a protected page → send to login.
  if (!user && !isApi && !isAuthPath) {
    return redirectPreservingCookies(request, response, '/login')
  }

  // Signed-in user hitting an auth page → send home.
  if (user && isAuthPath) {
    return redirectPreservingCookies(request, response, '/record')
  }

  return response
}

/**
 * Build a redirect that keeps any auth cookies the Supabase client just wrote on
 * `source`, so a refreshed session is not dropped by the redirect.
 */
function redirectPreservingCookies(
  request: NextRequest,
  source: NextResponse,
  pathname: string,
): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search = ''
  const redirect = NextResponse.redirect(url)
  for (const cookie of source.cookies.getAll()) {
    redirect.cookies.set(cookie)
  }
  return redirect
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and files:
     * - _next/static, _next/image
     * - favicon, manifest, icons
     * - common image/font extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)',
  ],
}
