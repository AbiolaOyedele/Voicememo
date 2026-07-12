'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useSwipeNav } from '@/hooks/useSwipeNav'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { useGuestMigration } from '@/hooks/useGuestMigration'
import { TabBar } from './TabBar'
import { Splash } from './Splash'

/**
 * Client shell for the three main tabs: makes content swipeable between tabs,
 * animates transitions between tabs, and renders the fixed bottom TabBar.
 * Content gets bottom padding so it is never hidden behind the bar. Also flushes
 * the offline recording queue and migrates any guest notes once signed in.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const ref = useSwipeNav<HTMLDivElement>()
  const pathname = usePathname()
  const reduced = useReducedMotion()
  useOfflineSync()
  useGuestMigration()

  return (
    <>
      <Splash />
      <div ref={ref} className="flex min-h-[100dvh] flex-1 flex-col pb-24">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            className="flex flex-1 flex-col"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
      <TabBar />
    </>
  )
}
