'use client'

import { Suspense, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { getAnalyticsConsent } from '@/lib/analytics-consent'
import { initPostHog, isPostHogInitialized, posthog } from '@/lib/posthog'

/**
 * App Router doesn't fire posthog-js's built-in pageview autocapture on
 * client-side navigations (no full page load), so pageviews are captured
 * manually on every pathname/search-param change instead.
 */
function PostHogPageview() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname || !isPostHogInitialized()) return
    const url = searchParams?.toString() ? `${pathname}?${searchParams.toString()}` : pathname
    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams])

  return null
}

/**
 * Starts tracking only if the visitor already granted analytics consent on a
 * previous visit (the cookie set by `grantAnalyticsConsent`). First-time
 * consent is captured on the login screen, which calls `initPostHog()`
 * directly the moment someone accepts — see `(auth)/login/page.tsx`.
 */
export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (getAnalyticsConsent() === 'granted') initPostHog()
  }, [])

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageview />
      </Suspense>
      {children}
    </>
  )
}
