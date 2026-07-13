'use client'

import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { useGuestMigration } from '@/hooks/useGuestMigration'
import {
  RefreshControlContext,
  type RefreshControl,
  type RefreshHandler,
} from '@/hooks/useRefreshControl'
import { TabBar } from './TabBar'
import { Splash } from './Splash'
import { InstallPrompt } from './InstallPrompt'
import { PullToRefresh } from './PullToRefresh'

/** Tab order for swipe navigation: Library ← Record → Account. */
const ORDER = ['/library', '/record', '/account']

function tabIndex(pathname: string): number {
  return ORDER.findIndex((p) => pathname === p || pathname.startsWith(`${p}/`))
}

const SWIPE_DISTANCE = 60 // px — drag distance that commits a tab change
const DIRECTION_LOCK_PX = 10 // px of movement before we decide horizontal-swipe vs vertical-scroll
const EDGE_RESISTANCE = 0.3 // how much the drag slows past the first/last tab

const variants = {
  enter: (direction: number) => ({ opacity: 0, x: direction >= 0 ? 32 : -32 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction >= 0 ? -32 : 32 }),
}

/**
 * Client shell for the three main tabs. Swipe navigation uses plain,
 * `{ passive: true }` touch listeners — never Framer Motion's `drag` prop.
 * `drag` intercepts pointer events at the container level, which reliably
 * breaks normal taps on buttons nested inside it (a well-known Framer Motion
 * gotcha, on both touch and mouse). Passive listeners only ever *observe*
 * touches, so ordinary clicks/taps on page content are never affected.
 *
 * A swipe only starts moving content once it's clearly horizontal
 * (DIRECTION_LOCK_PX), so vertical scrolling and simple taps are untouched.
 * Also renders the fixed bottom TabBar, and flushes the offline recording
 * queue / migrates guest notes once signed in.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const reduced = useReducedMotion()
  useOfflineSync()
  useGuestMigration()

  const containerRef = useRef<HTMLDivElement>(null)
  const prevIndex = useRef(tabIndex(pathname))
  const [direction, setDirection] = useState(0)

  // Single app-wide pull-to-refresh. Pages that fetch client-side register
  // their own refetch via useRegisterRefresh; everything else (e.g. the
  // server-rendered Account page) falls back to a router refresh.
  const refreshHandler = useRef<RefreshHandler | null>(null)
  const [refreshDisabled, setRefreshDisabled] = useState(false)
  const refreshControl = useMemo<RefreshControl>(
    () => ({
      registerHandler: (fn) => {
        refreshHandler.current = fn
      },
      setDisabled: setRefreshDisabled,
    }),
    [],
  )
  const onRefresh = useCallback(async () => {
    if (refreshHandler.current) await refreshHandler.current()
    else router.refresh()
  }, [router])

  useEffect(() => {
    const idx = tabIndex(pathname)
    if (idx !== -1 && prevIndex.current !== -1 && idx !== prevIndex.current) {
      setDirection(idx > prevIndex.current ? 1 : -1)
    }
    prevIndex.current = idx
  }, [pathname])

  useEffect(() => {
    if (reduced) return
    const el = containerRef.current
    if (!el) return

    let startX = 0
    let startY = 0
    let decided = false // have we determined horizontal vs vertical yet?
    let swiping = false // confirmed horizontal swipe in progress
    let dx = 0

    function resetStyle(): void {
      if (!el) return
      el.style.transition = ''
      el.style.transform = ''
    }

    function onStart(e: TouchEvent): void {
      const t = e.touches[0]
      if (!t) return
      startX = t.clientX
      startY = t.clientY
      decided = false
      swiping = false
      if (el) el.style.transition = ''
    }

    function onMove(e: TouchEvent): void {
      const t = e.touches[0]
      if (!t || !el) return
      const moveX = t.clientX - startX
      const moveY = t.clientY - startY

      if (!decided) {
        if (Math.abs(moveX) < DIRECTION_LOCK_PX && Math.abs(moveY) < DIRECTION_LOCK_PX) return
        decided = true
        swiping = Math.abs(moveX) > Math.abs(moveY)
        if (!swiping) return // vertical gesture — leave it to normal page scroll
      }
      if (!swiping) return

      const idx = tabIndex(pathname)
      const atStart = idx <= 0 && moveX > 0
      const atEnd = idx >= ORDER.length - 1 && moveX < 0
      dx = atStart || atEnd ? moveX * EDGE_RESISTANCE : moveX
      el.style.transform = `translateX(${dx}px)`
    }

    function onEnd(): void {
      if (!swiping) {
        decided = false
        return
      }
      swiping = false
      decided = false
      const idx = tabIndex(pathname)
      const forward = dx < -SWIPE_DISTANCE
      const back = dx > SWIPE_DISTANCE

      if (forward && idx < ORDER.length - 1) {
        setDirection(1)
        resetStyle() // hand off cleanly — the page transition below takes it from here
        router.push(ORDER[idx + 1] as string)
      } else if (back && idx > 0) {
        setDirection(-1)
        resetStyle()
        router.push(ORDER[idx - 1] as string)
      } else if (el) {
        // Didn't clear the commit threshold — spring back to center.
        el.style.transition = 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)'
        el.style.transform = 'translateX(0px)'
        window.setTimeout(resetStyle, 220)
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: true })
    el.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
    }
  }, [pathname, router, reduced])

  return (
    <>
      <Splash />
      <div
        ref={containerRef}
        className="flex min-h-[100dvh] flex-1 flex-col overflow-x-hidden pb-24"
      >
        <RefreshControlContext.Provider value={refreshControl}>
          <PullToRefresh onRefresh={onRefresh} disabled={refreshDisabled}>
            {/* Grid stack: the outgoing and incoming pages share one cell and
                overlap during the transition, instead of stacking vertically in
                normal flow (which pushed the new page below the fold). */}
            <div className="grid flex-1">
              <AnimatePresence custom={direction} initial={false}>
                <motion.div
                  key={pathname}
                  custom={direction}
                  variants={variants}
                  initial={reduced ? false : 'enter'}
                  animate="center"
                  exit={reduced ? { opacity: 0 } : 'exit'}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className="col-start-1 row-start-1 flex min-w-0 flex-col"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </PullToRefresh>
        </RefreshControlContext.Provider>
      </div>
      <TabBar />
      <InstallPrompt />
    </>
  )
}
