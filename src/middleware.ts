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
 *
 * Deliberately single-origin: everything (marketing, login, record, etc.)
 * serves from the one domain. A same-day attempt to split marketing onto
 * www.trydumpty.com and the app onto app.trydumpty.com broke recording
 * uploads in production — the client PUTs audio directly to R2 from the
 * browser, and R2's bucket CORS policy only allowlists the single original
 * origin, not the new app subdomain. Reverted rather than chasing a CORS
 * config change under time pressure; revisit the subdomain split together
 * with updating R2's CORS policy if it's still wanted.
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
  // Legal pages are public everywhere, signed in or not.
  const isPublicPage = pathname === '/privacy' || pathname === '/terms'
  // The bare domain serves the public marketing landing page.
  const isLanding = pathname === '/'
  // Guests get local-only access to the main app via a cookie (no server session).
  const isGuest = request.cookies.get('dumpty_guest')?.value === '1'
  // Once someone has signed in, we remember this browser so that after they sign
  // out they return to /login rather than the marketing page. This cookie is set
  // on any authenticated request and deliberately outlives the Supabase session.
  const isReturning = request.cookies.get('dumpty_returning')?.value === '1'
  if (user) {
    response.cookies.set('dumpty_returning', '1', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
  }

  if (!user && !isGuest && !isApi && !isAuthPath && !isLanding && !isPublicPage) {
    return redirectPreservingCookies(request, response, '/login')
  }
  if (user && isAuthPath) {
    return redirectPreservingCookies(request, response, '/record')
  }
  // Signed-in and guest users skip the marketing page and land in the app.
  if ((user || isGuest) && isLanding) {
    return redirectPreservingCookies(request, response, '/record')
  }
  // A signed-out visitor who has an account (returned before) goes to /login;
  // only genuine first-time visitors see the marketing landing.
  if (isLanding && isReturning) {
    return redirectPreservingCookies(request, response, '/login')
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
     * - favicon, manifest, icons, the OG image route
     * - common image/font extensions
     *
     * opengraph-image must stay unauthenticated like icon/apple-icon — link
     * crawlers (Slack, iMessage, Twitter) hit it with no session and no
     * guest cookie, so without this exclusion it 302s to /login and every
     * shared link loses its preview image.
     */
    '/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)',
  ],
}
