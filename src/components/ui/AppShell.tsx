'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'framer-motion'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { useGuestMigration } from '@/hooks/useGuestMigration'
import { TabBar } from './TabBar'
import { Splash } from './Splash'
import { InstallPrompt } from './InstallPrompt'

/** Tab order for swipe navigation: Library ← Record → Account. */
const ORDER = ['/library', '/record', '/account']

function tabIndex(pathname: string): number {
  return ORDER.findIndex((p) => pathname === p || pathname.startsWith(`${p}/`))
}

const SWIPE_DISTANCE = 60 // px — drag distance that commits a tab change
const SWIPE_VELOCITY = 500 // px/s — a fast flick commits even under the distance threshold

const variants = {
  enter: (direction: number) => ({ opacity: 0, x: direction >= 0 ? 32 : -32 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction >= 0 ? -32 : 32 }),
}

/**
 * Client shell for the three main tabs. Content follows the finger in real
 * time while dragging (via Framer Motion's `drag`, not a release-only
 * threshold check) and springs back if the swipe doesn't clear the
 * commit threshold. Committed swipes and tab-bar taps both animate in the
 * direction of travel. Also renders the fixed bottom TabBar, and flushes the
 * offline recording queue / migrates guest notes once signed in.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const reduced = useReducedMotion()
  useOfflineSync()
  useGuestMigration()

  const prevIndex = useRef(tabIndex(pathname))
  const [direction, setDirection] = useState(0)

  useEffect(() => {
    const idx = tabIndex(pathname)
    if (idx !== -1 && prevIndex.current !== -1 && idx !== prevIndex.current) {
      setDirection(idx > prevIndex.current ? 1 : -1)
    }
    prevIndex.current = idx
  }, [pathname])

  function handleDragEnd(_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo): void {
    const idx = tabIndex(pathname)
    if (idx === -1) return
    const forward = info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY
    const back = info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY
    if (forward && idx < ORDER.length - 1) {
      setDirection(1)
      router.push(ORDER[idx + 1] as string)
    } else if (back && idx > 0) {
      setDirection(-1)
      router.push(ORDER[idx - 1] as string)
    }
  }

  return (
    <>
      <Splash />
      <div className="flex min-h-[100dvh] flex-1 flex-col overflow-x-hidden pb-24">
        <AnimatePresence custom={direction} initial={false}>
          <motion.div
            key={pathname}
            custom={direction}
            variants={variants}
            initial={reduced ? false : 'enter'}
            animate="center"
            exit={reduced ? { opacity: 0 } : 'exit'}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            drag={reduced ? false : 'x'}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.65}
            onDragEnd={handleDragEnd}
            className="flex flex-1 flex-col"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
      <TabBar />
      <InstallPrompt />
    </>
  )
}
