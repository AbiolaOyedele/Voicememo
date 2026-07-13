'use client'

import { useAdminResource } from '@/hooks/useAdminResource'
import type { AdminUserStats } from '@/types/admin'
import { PushBroadcaster } from './PushBroadcaster'
import { PanelLoading, PanelError } from './adminUi'
import { BackToAppButton } from './BackToAppButton'

interface StatsData {
  users: AdminUserStats
  pushSubscriberCount: number
}

export function AdminMarketingPanel() {
  const { data, loading, error, reload } = useAdminResource<StatsData>('/api/v1/admin/stats')

  if (loading) return <PanelLoading />
  if (error || !data) return <PanelError onRetry={reload} />

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-muted text-xs font-medium tracking-wide uppercase">Send a push</h2>
      <PushBroadcaster subscriberCount={data.pushSubscriberCount} />
      <BackToAppButton />
    </div>
  )
}
