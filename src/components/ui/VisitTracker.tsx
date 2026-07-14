'use client'

import { useEffect } from 'react'
import { trackVisit } from '@/lib/visitor'
import { getAnalyticsConsent } from '@/lib/analytics-consent'

/**
 * Fires a single anonymous visit ping the first time a browser opens the app —
 * but only once analytics consent has been granted (see AnalyticsConsentNotice).
 * Covers returning visitors who already consented in a prior session; a
 * first-time grant fires its own ping directly from grantAnalyticsConsent so
 * there's no window where consent is granted but the visit is never counted.
 * Renders nothing.
 */
export function VisitTracker() {
  useEffect(() => {
    if (getAnalyticsConsent() === 'granted') trackVisit()
  }, [])
  return null
}
