'use client'

import type { ReactNode } from 'react'
import { useSwipeNav } from '@/hooks/useSwipeNav'
import { TabBar } from './TabBar'

/**
 * Client shell for the three main tabs: makes content swipeable between tabs and
 * renders the fixed bottom TabBar. Content gets bottom padding so it is never
 * hidden behind the bar.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const ref = useSwipeNav<HTMLDivElement>()
  return (
    <>
      <div ref={ref} className="flex min-h-[100dvh] flex-1 flex-col pb-24">
        {children}
      </div>
      <TabBar />
    </>
  )
}
