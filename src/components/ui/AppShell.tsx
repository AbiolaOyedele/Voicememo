'use client'

import type { ReactNode } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, useMotionValue, animate, useReducedMotion } from 'framer-motion'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { useGuestMigration } from '@/hooks/useGuestMigration'
import {
  RefreshControlContext,
  type RefreshControl,
  type RefreshHandler,
} from '@/hooks/useRefreshControl'
import { TabBar, TABS } from './TabBar'
import { Splash } from './Splash'
import { InstallPrompt } from './InstallPrompt'
import { PullToRefresh } from './PullToRefresh'

/** Tab order for swipe navigation: Library ← Record → Account. */
const ORDER = TABS.map((t) => t.href)

function tabIndex(pathname: string): number {
  return ORDER.findIndex((p) => pathname === p || pathname.startsWith(`${p}/`))
}

const DIRECTION_LOCK_PX = 10 // px of movement before we commit to horizontal-swipe vs vertical-scroll
const PROJECTION_MS = 90 // how far ahead (ms) we project the fling to decide the landing page
const COMMIT_FRACTION = 0.5 // projected travel past this fraction of a page width flips the page
const RUBBER_C = 0.55 // Apple's rubber-band constant for resistance past the first/last tab

// A velocity-seeded spring is what makes the release continue the finger's
// motion seamlessly (see WWDC "Designing Fluid Interfaces"). Stiff + well-damped
// so it settles quickly without a bouncy overshoot.
const SPRING = { type: 'spring' as const, stiffness: 520, damping: 44 }

/** Apple's rubber-band resistance: pushback grows the further you pull past an edge. */
function rubberband(overshoot: number, dimension: number): number {
  const x = Math.abs(overshoot)
  const resisted = (x * dimension * RUBBER_C) / (dimension + RUBBER_C * x)
  return Math.sign(overshoot) * resisted
}

/** Faint destination hint shown in the neighbour cell the finger reveals mid-swipe. */
function TabPlaceholder({ index }: { index: number }) {
  const tab = TABS[index]
  if (!tab) return <div className="bg-canvas h-full w-full" />
  const { Icon, label } = tab
  return (
    <div className="bg-canvas text-muted flex h-full w-full flex-col items-center justify-center gap-3">
      <Icon size={28} />
      <span className="text-sm">{label}</span>
    </div>
  )
}

/**
 * Client shell for the three main tabs, with an iOS-style paged swipe.
 *
 * The three tabs live in a horizontal track: the centre cell is the live route,
 * the neighbours are faint placeholders the finger reveals (the Account tab is a
 * server component, so the real adjacent pages can't be mounted client-side).
 * The track follows the finger 1:1 via a Framer motion value — never the `drag`
 * prop, which intercepts pointer events and breaks taps on nested buttons.
 * Listeners are `{ passive: true }`, so ordinary taps and vertical scrolling are
 * untouched; a swipe only engages once it's clearly horizontal.
 *
 * On release we project the fling (velocity × lookahead) to pick the landing
 * page and spring the track there seeded with the finger's velocity — a single
 * continuous motion, not a reset-then-animate. Past the first/last tab the drag
 * meets Apple's rubber-band resistance. The route changes only after the spring
 * lands, so navigation cost never stutters the animation.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const reduced = useReducedMotion()
  useOfflineSync()
  useGuestMigration()

  const viewportRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const widthRef = useRef(0)
  const x = useMotionValue(0)
  const animRef = useRef<{ stop: () => void } | null>(null)

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

  // Measure the viewport so cells are exactly one screen wide and the centre
  // cell rests at x = -width. Re-measured on resize/orientation change.
  useLayoutEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const measure = (): void => {
      const w = el.clientWidth
      if (w === 0) return
      widthRef.current = w
      setWidth(w)
      x.set(-w) // keep the centre cell centred
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [x])

  // Snap the centre cell back into view instantly whenever the route changes —
  // the just-navigated page replaces the placeholder at rest, no visible slide.
  useLayoutEffect(() => {
    if (widthRef.current > 0) x.set(-widthRef.current)
  }, [pathname, x])

  // Prefetch adjacent tabs so a committed swipe navigates instantly instead of
  // stalling on an RSC round-trip. (No-op in dev; matters in production.)
  useEffect(() => {
    const idx = tabIndex(pathname)
    if (idx === -1) return
    if (idx > 0) router.prefetch(ORDER[idx - 1] as string)
    if (idx < ORDER.length - 1) router.prefetch(ORDER[idx + 1] as string)
  }, [pathname, router])

  useEffect(() => {
    if (reduced) return
    const el = viewportRef.current
    if (!el) return

    let startX = 0
    let startY = 0
    let decided = false // horizontal vs vertical resolved yet?
    let swiping = false // confirmed horizontal swipe in progress
    let dx = 0 // signed drag offset from centre
    let lastX = 0
    let lastT = 0
    let velocity = 0 // px/ms, signed — recent finger speed

    function onStart(e: TouchEvent): void {
      const t = e.touches[0]
      if (!t) return
      animRef.current?.stop() // grab an in-flight settle mid-air
      startX = t.clientX
      startY = t.clientY
      lastX = t.clientX
      lastT = e.timeStamp
      velocity = 0
      dx = 0
      decided = false
      swiping = false
    }

    function onMove(e: TouchEvent): void {
      const t = e.touches[0]
      const w = widthRef.current
      if (!t || w === 0) return
      const moveX = t.clientX - startX
      const moveY = t.clientY - startY

      if (!decided) {
        if (Math.abs(moveX) < DIRECTION_LOCK_PX && Math.abs(moveY) < DIRECTION_LOCK_PX) return
        decided = true
        swiping = Math.abs(moveX) > Math.abs(moveY)
        if (!swiping) return // vertical gesture — leave it to normal page scroll
      }
      if (!swiping) return

      const dt = e.timeStamp - lastT
      if (dt > 0) velocity = (t.clientX - lastX) / dt
      lastX = t.clientX
      lastT = e.timeStamp

      const idx = tabIndex(pathname)
      const hasPrev = idx > 0
      const hasNext = idx >= 0 && idx < ORDER.length - 1
      // Free 1:1 tracking toward a real neighbour; rubber-band toward an edge.
      dx = moveX
      if ((moveX > 0 && !hasPrev) || (moveX < 0 && !hasNext)) dx = rubberband(moveX, w)
      x.set(-w + dx)
    }

    function onEnd(): void {
      const w = widthRef.current
      if (!swiping || w === 0) {
        decided = false
        swiping = false
        return
      }
      swiping = false
      decided = false

      const idx = tabIndex(pathname)
      // Project where the fling would land, then pick the destination page.
      const projected = dx + velocity * PROJECTION_MS
      const threshold = w * COMMIT_FRACTION
      const goNext = projected < -threshold && idx >= 0 && idx < ORDER.length - 1
      const goPrev = projected > threshold && idx > 0

      const velocityPxS = velocity * 1000 // Framer seeds spring velocity in px/s
      const settle = (target: number, onDone?: () => void): void => {
        animRef.current = animate(x, target, {
          ...SPRING,
          velocity: velocityPxS,
          ...(onDone ? { onComplete: onDone } : {}),
        })
      }

      if (goNext) {
        settle(-2 * w, () => router.push(ORDER[idx + 1] as string))
      } else if (goPrev) {
        settle(0, () => router.push(ORDER[idx - 1] as string))
      } else {
        settle(-w) // didn't clear the projection threshold — spring home
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: true })
    el.addEventListener('touchend', onEnd, { passive: true })
    el.addEventListener('touchcancel', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [pathname, router, reduced, x])

  const idx = tabIndex(pathname)
  const showTrack = !reduced && width > 0

  const center = (
    <div className="flex min-w-0 flex-1 flex-col pb-24">
      <PullToRefresh onRefresh={onRefresh} disabled={refreshDisabled}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="flex min-w-0 flex-1 flex-col"
        >
          {children}
        </motion.div>
      </PullToRefresh>
    </div>
  )

  return (
    <>
      <Splash />
      <div
        ref={viewportRef}
        className="relative flex min-h-[100dvh] flex-1 flex-col touch-pan-y overflow-x-hidden"
      >
        <RefreshControlContext.Provider value={refreshControl}>
          {showTrack ? (
            <motion.div className="flex flex-1" style={{ x }}>
              <div style={{ width }} className="shrink-0">
                {idx > 0 ? <TabPlaceholder index={idx - 1} /> : <div className="bg-canvas h-full" />}
              </div>
              <div style={{ width }} className="flex shrink-0 flex-col">
                {center}
              </div>
              <div style={{ width }} className="shrink-0">
                {idx >= 0 && idx < ORDER.length - 1 ? (
                  <TabPlaceholder index={idx + 1} />
                ) : (
                  <div className="bg-canvas h-full" />
                )}
              </div>
            </motion.div>
          ) : (
            // Fallback before measurement / with reduced motion: centre only.
            center
          )}
        </RefreshControlContext.Provider>
      </div>
      <TabBar />
      <InstallPrompt />
    </>
  )
}
