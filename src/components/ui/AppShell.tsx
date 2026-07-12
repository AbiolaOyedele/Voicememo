'use client'

import type { ReactNode } from 'react'
import { useSwipeNav } from '@/hooks/useSwipeNav'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { TabBar } from './TabBar'
import { Splash } from './Splash'

/**
 * Client shell for the three main tabs: makes content swipeable between tabs and
 * renders the fixed bottom TabBar. Content gets bottom padding so it is never
 * hidden behind the bar. Also flushes the offline recording queue app-wide when
 * connectivity returns.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const ref = useSwipeNav<HTMLDivElement>()
  useOfflineSync()
  return (
    <>
      <Splash />
      <div ref={ref} className="flex min-h-[100dvh] flex-1 flex-col pb-24">
        {children}
      </div>
      <TabBar />
    </>
  )
}
