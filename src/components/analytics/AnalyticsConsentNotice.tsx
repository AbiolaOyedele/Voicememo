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
 * banner. Renders as a small fixed corner card (not inline in the page flow)
 * so it never pushes other content around. Non-blocking: email, Google, and
 * guest sign-in all work regardless of whether this has been answered yet.
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
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.3 }}
          className="rounded-card border-ink/10 bg-canvas fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 flex flex-col gap-3 border p-4 shadow-lg sm:inset-x-auto sm:left-4 sm:w-72"
        >
          <div>
            <p className="text-sm font-medium">Can we use cookies?</p>
            <p className="text-muted mt-1 text-xs leading-snug">
              We use cookies to understand how Dumpty is used and improve the app.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={decline}
              className="rounded-btn border-ink/15 text-ink hover:bg-ink/[0.04] flex min-h-11 flex-1 items-center justify-center border px-4 text-sm transition-colors"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={accept}
              className="rounded-btn bg-flame flex min-h-11 flex-1 items-center justify-center px-4 text-sm text-white transition-opacity hover:opacity-90"
            >
              Accept
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
