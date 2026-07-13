'use client'

import { useAdminResource } from '@/hooks/useAdminResource'
import type { AdminUserStats, RecentSignup } from '@/types/admin'
import { StatTile, PanelLoading, PanelError, fmtDate } from './adminUi'
import { BackToAppButton } from './BackToAppButton'

interface StatsData {
  users: AdminUserStats
  pushSubscriberCount: number
}

export function AdminDashboardPanel() {
  const { data, loading, error, reload } = useAdminResource<StatsData>('/api/v1/admin/stats')

  if (loading) return <PanelLoading />
  if (error || !data) return <PanelError onRetry={reload} />

  const { users, pushSubscriberCount } = data

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-muted mb-3 text-xs font-medium tracking-wide uppercase">Users</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Total users" value={users.totalUsers} />
          <StatTile label="New today" value={users.signupsToday} />
          <StatTile label="Last 7 days" value={users.signups7d} />
          <StatTile label="Last 30 days" value={users.signups30d} />
        </div>
        <div className="mt-3">
          <StatTile label="Push subscribers" value={pushSubscriberCount} />
        </div>
      </section>

      <section>
        <h2 className="text-muted mb-3 text-xs font-medium tracking-wide uppercase">
          Recent signups
        </h2>
        {users.recentSignups.length === 0 ? (
          <p className="text-muted text-sm">No signups yet.</p>
        ) : (
          <ul className="rounded-card border-ink/10 divide-ink/10 divide-y border">
            {users.recentSignups.map((s: RecentSignup) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0 truncate text-[15px]">{s.email ?? '(no email)'}</span>
                <span className="text-muted shrink-0 text-xs">
                  {s.provider ? `${s.provider} · ` : ''}
                  {fmtDate(s.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <BackToAppButton />
    </div>
  )
}
