'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Logo } from './Logo'

const SEEN_KEY = 'dumpty_splash_seen'

/**
 * Brand loading screen shown once when the app is opened (per tab session).
 * Covers the UI with the Dumpty wordmark, then fades away. Runs inside the
 * signed-in shell, so it only greets an authenticated (or guest) session.
 */
export function Splash() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only on a fresh app open — not on every client-side navigation.
    if (sessionStorage.getItem(SEEN_KEY)) return
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
