'use client'

import posthog from 'posthog-js'
import { publicEnv } from '@/config/env'

let initialized = false

/**
 * Initializes posthog-js once. No-op when NEXT_PUBLIC_POSTHOG_KEY is unset or
 * this has already run. Must only be called after analytics consent is
 * granted — see `src/lib/analytics-consent.ts`.
 */
export function initPostHog(): void {
  if (initialized || typeof window === 'undefined') return
  if (!publicEnv.NEXT_PUBLIC_POSTHOG_KEY) return
  posthog.init(publicEnv.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: publicEnv.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    capture_pageview: false, // captured manually on route change — see PostHogPageview
    person_profiles: 'identified_only',
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') ph.opt_out_capturing()
      // This PostHog project is shared with Fey — tag every event so the two
      // apps stay distinguishable in shared dashboards/insights.
      ph.register({ app: 'dumpty' })
    },
  })
  initialized = true
}

/** Whether posthog-js has actually been initialized (consent granted + key present). */
export function isPostHogInitialized(): boolean {
  return initialized
}

export { posthog }
