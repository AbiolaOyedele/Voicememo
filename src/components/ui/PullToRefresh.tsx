'use client'

import { useRef, useState, type ReactNode, type TouchEvent as ReactTouchEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Spinner } from './Spinner'
import { Logo } from './Logo'
import { Portal } from './Portal'

const TRIGGER_DISTANCE = 64 // px of pull that commits a refresh
const MAX_PULL = 96 // px visual cap
const RESISTANCE = 0.45 // how much the pull slows past the trigger distance

/**
 * sessionStorage flag set just before a pull-to-refresh reload so the brand
 * splash shows again on the fresh load, bridging the reload with the Dumpty
 * logo so it's obvious the app actually reloaded. Read + cleared by Splash.
 */
export const REFRESH_FLAG = 'dumpty_refreshing'

/** A random one shows up each time you refresh — small, on-brand fun. */
const REFRESH_MESSAGES = [
  'Putting Humpty together again…',
  "All the king's horses are on it…",
  "Careful — don't fall off the wall…",
  'Patching up the pieces…',
]

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: ReactNode
  /** Disables the gesture entirely — e.g. mid-recording, where a surprise
   * reload would destroy an in-progress take. */
  disabled?: boolean
}

/**
 * Custom pull-to-refresh gesture for the app's PWA shell. The app disables the
 * browser's native rubber-band scroll (`overscroll-behavior-y: none`) for an
 * app-like feel, which also removes the OS's built-in pull-to-refresh — this
 * restores an equivalent gesture. Only engages when the page is already
 * scrolled to the top, so it never fights normal scrolling.
 *
 * On commit it does a real, full page reload (not a soft data refetch), behind
 * a full-screen Dumpty logo so the user can clearly see the app reloaded — and
 * a reload always picks up a newer deploy if one is live.
 */
export function PullToRefresh({ onRefresh, children, disabled = false }: PullToRefreshProps) {
  const reduced = useReducedMotion()
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState('')
  const startY = useRef<number | null>(null)

  function onTouchStart(e: ReactTouchEvent): void {
    if (disabled || refreshing || window.scrollY > 0) {
      startY.current = null
      return
    }
    startY.current = e.touches[0]?.clientY ?? null
    // Pick the Humpty line up front so it's already there as the user pulls.
    setMessage(REFRESH_MESSAGES[Math.floor(Math.random() * REFRESH_MESSAGES.length)] as string)
  }

  function onTouchMove(e: ReactTouchEvent): void {
    if (startY.current === null) return
    const dy = (e.touches[0]?.clientY ?? startY.current) - startY.current
    if (dy <= 0) {
      setPull(0)
      return
    }
    const eased =
      dy < TRIGGER_DISTANCE ? dy : TRIGGER_DISTANCE + (dy - TRIGGER_DISTANCE) * RESISTANCE
    setPull(Math.min(eased, MAX_PULL))
  }

  function onTouchEnd(): void {
    if (startY.current === null) return
    startY.current = null
    if (pull >= TRIGGER_DISTANCE) {
      setRefreshing(true) // show the Dumpty logo overlay
      setPull(TRIGGER_DISTANCE)
      // Flush any registered client refetch, then hard-reload so the refresh is
      // real and unmistakable. The splash flag keeps the logo up across reload.
      try {
        sessionStorage.setItem(REFRESH_FLAG, '1')
      } catch {
        /* private mode — non-fatal */
      }
      void onRefresh().catch(() => {})
      window.setTimeout(() => window.location.reload(), 600)
    } else {
      setPull(0)
    }
  }

  const progress = Math.min(pull / TRIGGER_DISTANCE, 1)
  const showMessage = refreshing || progress > 0.4

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="flex flex-1 flex-col"
    >
      <motion.div
        animate={{ height: refreshing ? TRIGGER_DISTANCE : pull }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
        className="pointer-events-none flex shrink-0 flex-col items-center justify-center gap-1 overflow-hidden"
        aria-hidden={!refreshing}
      >
        <div style={{ opacity: refreshing ? 1 : progress }}>
          <Spinner size={20} className={refreshing ? 'text-flame' : 'text-muted'} />
        </div>
        {showMessage ? (
          <span className="text-muted px-6 text-center text-[11px]" style={{ opacity: progress }}>
            {message}
          </span>
        ) : null}
      </motion.div>
      {children}

      {refreshing ? (
        <Portal>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-canvas fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5"
            aria-live="polite"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <Logo className="text-4xl" />
            </motion.div>
            <Spinner size={22} className="text-flame" />
          </motion.div>
        </Portal>
      ) : null}
    </div>
  )
}
