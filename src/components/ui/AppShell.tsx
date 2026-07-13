'use client'

import type { ReactNode } from 'react'
import { useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { useGuestMigration } from '@/hooks/useGuestMigration'
import { useAuthCacheGuard } from '@/hooks/useAuthCacheGuard'
import {
  RefreshControlContext,
  type RefreshControl,
  type RefreshHandler,
} from '@/hooks/useRefreshControl'
import { TabBar, TABS } from './TabBar'
import { Splash } from './Splash'
import { EngagementNudge } from './EngagementNudge'
import { PullToRefresh } from './PullToRefresh'
import { UpdatePrompt } from './UpdatePrompt'
import { SwipeCarousel } from './SwipeCarousel'

/** Exact tab routes get the swipe carousel; deeper paths (e.g. a dump detail) render normally. */
function isTabRoute(pathname: string): boolean {
  return TABS.some((t) => t.href === pathname)
}

/**
 * Client shell for the main app. On a tab route it renders the swipe carousel
 * (all three tabs mounted in a native scroll-snap track — see SwipeCarousel);
 * on deeper routes (a dump detail) it renders that page normally. Also hosts
 * the fixed tab bar, splash, install + update prompts, and flushes the offline
 * queue / migrates guest notes once signed in.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  useOfflineSync()
  useGuestMigration()
  useAuthCacheGuard()

  // Kept so pages' useRegisterRefresh / useRefreshDisabled still resolve; the
  // pull-to-refresh gesture itself now hard-reloads, but recording still needs
  // to suppress it (a reload would destroy an in-progress take).
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

  return (
    <>
      <Splash />
      <RefreshControlContext.Provider value={refreshControl}>
        {isTabRoute(pathname) ? (
          // The carousel renders its own TabBar inside its context so the active
          // tab follows the swipe.
          <SwipeCarousel initialHref={pathname} disabled={refreshDisabled} />
        ) : (
          <>
            <div className="h-[100dvh]">
              <PullToRefresh disabled={refreshDisabled}>
                <div className="flex min-h-full flex-col pb-24">{children}</div>
              </PullToRefresh>
            </div>
            <TabBar />
          </>
        )}
      </RefreshControlContext.Provider>
      <EngagementNudge />
      <UpdatePrompt />
    </>
  )
}
