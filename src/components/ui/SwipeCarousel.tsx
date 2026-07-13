'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { TabCarouselContext, type TabCarouselApi } from '@/hooks/useTabCarousel'
import { TabBar, TABS } from './TabBar'
import { PullToRefresh } from './PullToRefresh'
import LibraryPage from '@/app/(main)/library/page'
import RecordPage from '@/app/(main)/record/page'
import { AccountPanel } from '@/components/features/account/AccountPanel'

/** Panels aligned 1:1 with TabBar's TABS order: Library, Record, Account. */
const PANELS = [LibraryPage, RecordPage, AccountPanel] as const

function hrefToIndex(pathname: string): number {
  const i = TABS.findIndex((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))
  return i < 0 ? 0 : i
}

/**
 * Native paged tab swipe — the same mechanism Instagram/X use on the web.
 *
 * All three tab pages are mounted at once, side by side, in a horizontal
 * CSS scroll-snap container. The browser's own compositor handles the finger
 * tracking, momentum, and snap (buttery, off the main thread) — there is no
 * JS-driven transform. Swiping never navigates; it just scrolls between the
 * already-rendered panels, and we mirror the URL with `replaceState` as each
 * panel snaps into view so refresh/deep-links still work. `goToTab` (used by
 * the tab bar and by in-app tab links) scrolls smoothly to a panel.
 */
export function SwipeCarousel({
  initialHref,
  disabled = false,
}: {
  initialHref: string
  disabled?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const initialIndex = useMemo(() => hrefToIndex(initialHref), [initialHref])
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const activeIndexRef = useRef(initialIndex)

  // Position on the correct panel before the first paint (no visible jump).
  // Re-apply on the next frame in case layout wasn't ready (clientWidth 0).
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const apply = (): void => {
      el.scrollLeft = initialIndex * el.clientWidth
    }
    apply()
    const raf = requestAnimationFrame(apply)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // As a panel snaps into view, update the active tab + mirror the URL. Uses a
  // rAF-throttled scroll listener rather than IntersectionObserver so the URL
  // flips exactly at the halfway point and never lags the finger.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let raf = 0
    const onScroll = (): void => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const w = el.clientWidth || 1
        const idx = Math.min(TABS.length - 1, Math.max(0, Math.round(el.scrollLeft / w)))
        if (idx !== activeIndexRef.current) {
          activeIndexRef.current = idx
          setActiveIndex(idx)
          const href = TABS[idx]?.href
          if (href) window.history.replaceState(window.history.state, '', href)
        }
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // Keep the active panel centred across viewport resizes / orientation changes.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onResize = (): void => {
      el.scrollLeft = activeIndexRef.current * el.clientWidth
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const goToTab = useCallback((href: string) => {
    const el = containerRef.current
    if (!el) return
    const idx = TABS.findIndex((t) => t.href === href)
    if (idx < 0) return
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' })
  }, [])

  const api = useMemo<TabCarouselApi>(
    () => ({ activeHref: TABS[activeIndex]?.href ?? TABS[0]!.href, goToTab }),
    [activeIndex, goToTab],
  )

  return (
    <TabCarouselContext.Provider value={api}>
      <div
        ref={containerRef}
        className="no-scrollbar flex h-[100dvh] snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
      >
        {TABS.map((tab, i) => {
          const Panel = PANELS[i]!
          return (
            <section key={tab.href} className="h-full w-full shrink-0 snap-start snap-always">
              <PullToRefresh disabled={disabled}>
                <div className="flex min-h-full flex-col pb-24">
                  <Panel />
                </div>
              </PullToRefresh>
            </section>
          )
        })}
      </div>
      <TabBar />
    </TabCarouselContext.Provider>
  )
}
