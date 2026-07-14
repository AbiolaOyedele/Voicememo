'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  denyAnalyticsConsent,
  getAnalyticsConsent,
  grantAnalyticsConsent,
} from '@/lib/analytics-consent'

/**
 * Cookie consent, asked once on the login screen — the one entry point every
 * visitor passes through before reaching the app, rather than a site-wide
 * banner. Non-blocking: email, Google, and guest sign-in all work regardless
 * of whether this has been answered yet.
 */
export function AnalyticsConsentNotice() {
  // Starts "decided" so there's no flash of the notice before the cookie
  // check runs on mount (avoids a hydration mismatch too).
  const [decided, setDecided] = useState(true)

  useEffect(() => {
    setDecided(getAnalyticsConsent() !== null)
  }, [])

  function accept(): void {
    grantAnalyticsConsent()
    setDecided(true)
  }

  function decline(): void {
    denyAnalyticsConsent()
    setDecided(true)
  }

  return (
    <AnimatePresence>
      {!decided ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.3 }}
          className="rounded-btn border-ink/10 bg-ink/[0.03] mt-4 flex w-full max-w-xs flex-col gap-2 border p-3 text-center"
        >
          <p className="text-muted text-xs leading-snug">
            We use PostHog to see how Dumpty is used, so we can improve it. Your recordings and
            note content are never tracked.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={decline}
              className="text-muted hover:text-ink flex min-h-11 items-center px-2 text-xs underline underline-offset-4 transition-colors"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={accept}
              className="rounded-btn bg-flame flex min-h-11 items-center px-4 text-xs text-white transition-opacity hover:opacity-90"
            >
              Accept analytics
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
