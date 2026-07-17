'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import { motion } from 'framer-motion'
import { Logo } from '@/components/ui/Logo'
import { ChartIcon, MegaphoneIcon, ChatIcon } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { AdminDashboardPanel } from './AdminDashboardPanel'
import { AdminMarketingPanel } from './AdminMarketingPanel'
import { AdminFeedbackPanel } from './AdminFeedbackPanel'

interface AdminTab {
  label: string
  Icon: ComponentType<{ size?: number }>
  Panel: ComponentType
}

const TABS: AdminTab[] = [
  { label: 'Dashboard', Icon: ChartIcon, Panel: AdminDashboardPanel },
  { label: 'Marketing', Icon: MegaphoneIcon, Panel: AdminMarketingPanel },
  { label: 'Feedback', Icon: ChatIcon, Panel: AdminFeedbackPanel },
]

/**
 * Admin surface built to feel like the rest of Dumpty: a native scroll-snap
 * swipe between panels (same mechanism as the app's SwipeCarousel) and a
 * floating pill tab bar with icon + expanding label. Wordmark + "admin" tag up
 * top; each panel carries its own "Back to app" button.
 */
export function AdminShell() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const activeIndexRef = useRef(0)

  // Sync active tab to the scroll position (rAF-throttled), flipping at the
  // halfway point so the tab bar tracks the finger.
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
        }
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // Keep the active panel aligned across viewport resizes.
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onResize = (): void => {
      el.scrollLeft = activeIndexRef.current * el.clientWidth
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const goTo = useCallback((idx: number) => {
    const el = containerRef.current
    if (!el) return
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' })
  }, [])

  return (
    <div className="bg-canvas text-ink relative h-[100dvh] overflow-hidden">
      {/* Wordmark + admin tag */}
      <header className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3">
        <Logo as="span" className="text-xl" />
        <span className="border-ink/15 text-muted rounded-full border px-2 py-0.5 text-[11px] tracking-wide uppercase">
          Admin
        </span>
      </header>

      {/* Swipe track */}
      <div
        ref={containerRef}
        className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
      >
        {TABS.map(({ label, Panel }) => (
          <section
            key={label}
            className="h-full w-full shrink-0 snap-start snap-always overflow-y-auto"
          >
            <div className="mx-auto max-w-2xl px-5 pt-[calc(env(safe-area-inset-top)+4.5rem)] pb-32">
              <Panel />
            </div>
          </section>
        ))}
      </div>

      {/* Fade content out behind the floating nav — same treatment as the app's TabBar. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[calc(env(safe-area-inset-bottom)+8.5rem)]"
        style={{
          background:
            'linear-gradient(to top, var(--color-canvas) 0%, var(--color-canvas) 35%, transparent 100%)',
        }}
      />

      {/* Floating pill nav — mirrors the app's TabBar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1.75rem)]">
        <nav
          aria-label="Admin sections"
          className="border-ink/10 bg-canvas pointer-events-auto flex items-center gap-1 rounded-full border p-1.5 shadow-lg"
        >
          {TABS.map(({ label, Icon }, i) => {
            const active = activeIndex === i
            return (
              <motion.button
                key={label}
                type="button"
                onClick={() => goTo(i)}
                whileTap={{ scale: 0.96 }}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-11 min-w-11 items-center justify-center rounded-full px-3 transition-colors',
                  active ? 'bg-flame/12 text-flame' : 'text-muted hover:bg-ink/5',
                )}
              >
                <Icon size={22} />
                <motion.span
                  initial={false}
                  animate={{
                    width: active ? 'auto' : 0,
                    opacity: active ? 1 : 0,
                    marginLeft: active ? 8 : 0,
                  }}
                  transition={{
                    width: { type: 'spring', stiffness: 350, damping: 32 },
                    opacity: { duration: 0.18 },
                  }}
                  className="overflow-hidden text-sm whitespace-nowrap"
                >
                  {label}
                </motion.span>
              </motion.button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
