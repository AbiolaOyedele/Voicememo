'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Logo } from './Logo'
import { REFRESH_FLAG } from './PullToRefresh'

const SEEN_KEY = 'dumpty_splash_seen'

/**
 * Brand loading screen shown once when the app is opened (per tab session), and
 * again right after a pull-to-refresh reload (via {@link REFRESH_FLAG}) so the
 * Dumpty logo bridges the reload and the user clearly sees it happened. Covers
 * the UI with the Dumpty wordmark, then fades away.
 */
export function Splash() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // A pull-to-refresh reload always re-shows the splash, even within a session.
    const afterRefresh = sessionStorage.getItem(REFRESH_FLAG)
    if (afterRefresh) sessionStorage.removeItem(REFRESH_FLAG)
    // Otherwise only on a fresh app open — not on every client-side navigation.
    if (!afterRefresh && sessionStorage.getItem(SEEN_KEY)) return
    sessionStorage.setItem(SEEN_KEY, '1')
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), 1400)
    return () => clearTimeout(timer)
  }, [])

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="bg-canvas fixed inset-0 z-[100] flex items-center justify-center"
          aria-hidden
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <Logo className="text-7xl" />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
