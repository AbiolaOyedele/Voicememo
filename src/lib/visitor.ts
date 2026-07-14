/**
 * Anonymous visitor tracking: a long-lived, non-identifying browser cookie so
 * the admin dashboard can show how many people try the app, not just how many
 * sign up. No PII, never tied to an account — just a random id scoped to this
 * site, recorded once per browser.
 *
 * Callers must only invoke {@link trackVisit} once analytics consent has been
 * granted (see analytics-consent.ts) — this module has no consent check of its
 * own, since it's the same category of non-essential tracking as PostHog.
 */

const VISITOR_COOKIE = 'dumpty_vid'

function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))
  return match ? match.slice(name.length + 1) : null
}

/** If this browser hasn't been seen before, tag it and record the visit. */
export function trackVisit(): void {
  if (typeof document === 'undefined' || readCookie(VISITOR_COOKIE)) return

  const id = crypto.randomUUID()
  const maxAge = 60 * 60 * 24 * 365
  document.cookie = `${VISITOR_COOKIE}=${id}; path=/; max-age=${maxAge}; samesite=lax`

  fetch('/api/v1/visits', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ visitorId: id }),
    keepalive: true,
  }).catch(() => {
    // Best-effort — a dropped visit ping isn't worth surfacing to the user.
  })
}
