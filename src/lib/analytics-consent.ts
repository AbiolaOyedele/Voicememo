'use client'

import { initPostHog, isPostHogInitialized, posthog } from '@/lib/posthog'
import { trackVisit } from '@/lib/visitor'

/**
 * Cookie consent gate for PostHog. Dumpty has a single entry point everyone
 * passes through before reaching the app — the login screen — so consent is
 * asked there once, rather than via a site-wide banner. PostHog must never
 * load before this cookie says 'granted'.
 */
export const ANALYTICS_CONSENT_COOKIE = 'dumpty_analytics_consent'

export type AnalyticsConsent = 'granted' | 'denied'

/** The visitor's stored choice, or null if they haven't decided yet. */
export function getAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${ANALYTICS_CONSENT_COOKIE}=`))
  const value = match?.split('=')[1]
  return value === 'granted' || value === 'denied' ? value : null
}

function setConsentCookie(value: AnalyticsConsent): void {
  if (typeof document === 'undefined') return
  const maxAge = 60 * 60 * 24 * 365
  document.cookie = `${ANALYTICS_CONSENT_COOKIE}=${value}; path=/; max-age=${maxAge}; samesite=lax`
}

/** Records acceptance and starts tracking immediately — no reload needed. */
export function grantAnalyticsConsent(): void {
  setConsentCookie('granted')
  initPostHog()
  trackVisit()
}

/** Records refusal. If tracking had already started this session, stops it. */
export function denyAnalyticsConsent(): void {
  setConsentCookie('denied')
  if (isPostHogInitialized()) posthog.opt_out_capturing()
}
