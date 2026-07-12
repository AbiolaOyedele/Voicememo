'use client'

import { useRef, useState, type ReactNode, type TouchEvent as ReactTouchEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useUpdatePrompt } from '@/hooks/useUpdatePrompt'
import { Spinner } from './Spinner'

const TRIGGER_DISTANCE = 64 // px of pull that commits a refresh
const MAX_PULL = 96 // px visual cap
const RESISTANCE = 0.45 // how much the pull slows past the trigger distance

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: ReactNode
}

/**
 * Custom pull-to-refresh gesture for the app's PWA shell. The app disables the
 * browser's native rubber-band scroll (`overscroll-behavior-y: none`) for an
 * app-like feel, which also removes the OS's built-in pull-to-refresh — this
 * restores an equivalent gesture. Only engages when the page is already
 * scrolled to the top, so it never fights normal scrolling.
 *
 * Doubles as the update mechanism: when a newer deploy is live
 * (useUpdatePrompt), pulling down reloads the page instead of calling
 * `onRefresh` — no separate "new version available" banner needed.
 */
export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const reduced = useReducedMotion()
  const updateAvailable = useUpdatePrompt()
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef<number | null>(null)

  function onTouchStart(e: ReactTouchEvent): void {
    if (refreshing || window.scrollY > 0) {
      startY.current = null
      return
    }
    startY.current = e.touches[0]?.clientY ?? null
  }

  function onTouchMove(e: ReactTouchEvent): void {
    if (startY.current === null) return
    const dy = (e.touches[0]?.clientY ?? startY.current) - startY.current
    if (dy <= 0) {
      setPull(0)
      return
    }
    const eased = dy < TRIGGER_DISTANCE ? dy : TRIGGER_DISTANCE + (dy - TRIGGER_DISTANCE) * RESISTANCE
    setPull(Math.min(eased, MAX_PULL))
  }

  async function onTouchEnd(): Promise<void> {
    if (startY.current === null) return
    startY.current = null
    if (pull >= TRIGGER_DISTANCE) {
      setRefreshing(true)
      setPull(TRIGGER_DISTANCE)
      if (updateAvailable) {
        window.location.reload()
        return // page is reloading — nothing left to reset
      }
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
        setPull(0)
      }
    } else {
      setPull(0)
    }
  }

  const progress = Math.min(pull / TRIGGER_DISTANCE, 1)

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <motion.div
        animate={{ height: refreshing ? TRIGGER_DISTANCE : pull }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
        className="pointer-events-none flex flex-col items-center justify-center gap-0.5 overflow-hidden"
        aria-hidden={!refreshing}
      >
        <div style={{ opacity: refreshing ? 1 : progress }}>
          <Spinner size={20} className={refreshing || updateAvailable ? 'text-flame' : 'text-muted'} />
        </div>
        {updateAvailable && progress > 0.4 ? (
          <span className="text-flame text-[11px]">Release to update</span>
        ) : null}
      </motion.div>
      {children}
    </div>
  )
}
