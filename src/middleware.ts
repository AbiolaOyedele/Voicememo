import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { publicEnv } from '@/config/env'

/** Paths reachable without a session. Everything else (except APIs) needs auth. */
const AUTH_PATHS = ['/login', '/callback']

/**
 * Refreshes the Supabase session and applies page-level route protection:
 * signed-out users are sent to /login, signed-in users are kept out of the auth
 * pages. API routes are never redirected — they enforce auth themselves and
 * return 401 JSON. Server data access is always re-checked via requireUser().
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
  // The bare domain serves the public marketing landing page.
  const isLanding = pathname === '/'
  // Guests get local-only access to the main app via a cookie (no server session).
  const isGuest = request.cookies.get('dumpty_guest')?.value === '1'

  if (!user && !isGuest && !isApi && !isAuthPath && !isLanding) {
    return redirectPreservingCookies(request, response, '/login')
  }
  if (user && isAuthPath) {
    return redirectPreservingCookies(request, response, '/record')
  }
  // Signed-in and guest users skip the marketing page and land in the app.
  if ((user || isGuest) && isLanding) {
    return redirectPreservingCookies(request, response, '/record')
  }

  return response
}

/** Redirect while keeping any auth cookies the Supabase client just refreshed. */
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
    '/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)',
  ],
}
