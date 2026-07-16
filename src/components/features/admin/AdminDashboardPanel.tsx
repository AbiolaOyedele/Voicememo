'use client'

import { useMemo, useState } from 'react'
import { useAdminResource } from '@/hooks/useAdminResource'
import type { AdminUserStats, DailyStat, DumpTotals, UserAnalyticsRow, VisitStats } from '@/types/admin'
import { StatTile, PanelLoading, PanelError, PanelHeader, fmtMinutes } from './adminUi'
import { TrendChart, DonutChart, Segmented, type TrendPoint } from './charts'
import { BackToAppButton } from './BackToAppButton'

interface StatsData {
  users: AdminUserStats
  pushSubscriberCount: number
  visits: VisitStats
  dumps: DumpTotals
  daily: DailyStat[]
  userAnalytics: UserAnalyticsRow[]
}

type Series = 'visitors' | 'signups' | 'recordings'
type Range = '14' | '30'

const SERIES_OPTIONS = [
  { value: 'visitors', label: 'Visitors' },
  { value: 'signups', label: 'Signups' },
  { value: 'recordings', label: 'Ideas' },
] as const

const RANGE_OPTIONS = [
  { value: '14', label: '14d' },
  { value: '30', label: '30d' },
] as const

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function AdminDashboardPanel() {
  const { data, loading, error, reload } = useAdminResource<StatsData>('/api/v1/admin/stats')
  const [series, setSeries] = useState<Series>('visitors')
  const [range, setRange] = useState<Range>('14')

  const points: TrendPoint[] = useMemo(() => {
    if (!data) return []
    const window = data.daily.slice(-Number(range))
    return window.map((d) => ({ label: dayLabel(d.day), value: d[series] }))
  }, [data, series, range])

  if (loading && !data) return <PanelLoading />
  if (error || !data) return <PanelError onRetry={reload} />

  const { users, pushSubscriberCount, visits, dumps, userAnalytics } = data
  const rangeTotal = points.reduce((sum, p) => sum + p.value, 0)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <PanelHeader title="Overview" onRefresh={reload} refreshing={loading} />
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Total users" value={users.totalUsers} />
          <StatTile label="Total visitors" value={visits.totalVisitors} />
          <StatTile label="Ideas recorded" value={dumps.total} />
          <StatTile label="Audio recorded" value={fmtMinutes(dumps.totalSeconds)} />
        </div>
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-muted text-xs font-medium tracking-wide uppercase">Growth</h3>
          <div className="flex gap-2">
            <Segmented options={SERIES_OPTIONS} value={series} onChange={setSeries} />
            <Segmented options={RANGE_OPTIONS} value={range} onChange={setRange} />
          </div>
        </div>
        <div className="rounded-card border-ink/10 border p-4">
          <TrendChart points={points} />
          <p className="text-muted mt-2 text-xs">
            {rangeTotal.toLocaleString()}{' '}
            {series === 'recordings' ? 'ideas' : series === 'signups' ? 'signups' : 'visitors'} in
            the last {range} days
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-muted mb-3 text-xs font-medium tracking-wide uppercase">
          Idea pipeline
        </h3>
        <div className="rounded-card border-ink/10 border p-4">
          <DonutChart
            centerLabel="ideas total"
            segments={[
              { label: 'Ready', value: dumps.ready, color: 'var(--color-flame)' },
              { label: 'In progress', value: dumps.inFlight, color: '#ffb27d' },
              { label: 'Failed', value: dumps.failed, color: 'var(--color-ink)' },
            ]}
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <StatTile label="Transcribed" value={dumps.transcribed} />
          <StatTile label="Action plans" value={dumps.actionPlans} />
          <StatTile label="Push subscribers" value={pushSubscriberCount} />
        </div>
      </section>

      <section>
        <h3 className="text-muted mb-3 text-xs font-medium tracking-wide uppercase">
          Users by activity
        </h3>
        {userAnalytics.length === 0 ? (
          <p className="text-muted text-sm">No users yet.</p>
        ) : (
          <UserAnalyticsList rows={userAnalytics} />
        )}
      </section>

      <BackToAppButton />
    </div>
  )
}

const USER_PAGE = 10

/**
 * Per-user lifetime usage — the raw material for future credit/subscription
 * decisions. Each row: email, ideas + recorded time, an activity bar relative
 * to the most active user, and last-activity date. Paged client-side.
 */
function UserAnalyticsList({ rows }: { rows: UserAnalyticsRow[] }) {
  const [shown, setShown] = useState(USER_PAGE)
  const maxIdeas = Math.max(1, ...rows.map((r) => r.ideas))

  return (
    <div className="flex flex-col gap-2">
      <ul className="rounded-card border-ink/10 divide-ink/10 divide-y border">
        {rows.slice(0, shown).map((r) => (
          <li key={r.id} className="flex flex-col gap-1.5 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-[15px]">{r.email ?? '(no email)'}</span>
              <span className="text-muted shrink-0 text-xs">
                {r.lastRecordingAt
                  ? `active ${new Date(r.lastRecordingAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                  : 'no ideas yet'}
              </span>
            </div>
            <div className="bg-ink/5 h-1 overflow-hidden rounded-full">
              <div
                className="bg-flame/70 h-full rounded-full"
                style={{ width: `${(r.ideas / maxIdeas) * 100}%` }}
              />
            </div>
            <span className="text-muted text-xs tabular-nums">
              {r.ideas.toLocaleString()} ideas · {fmtMinutes(r.totalSeconds)} ·{' '}
              {r.actionPlans.toLocaleString()} plans
              {r.failed > 0 ? ` · ${r.failed} failed` : ''}
            </span>
          </li>
        ))}
      </ul>
      {rows.length > shown ? (
        <button
          type="button"
          onClick={() => setShown((s) => s + USER_PAGE)}
          className="text-muted hover:text-ink min-h-11 self-center text-sm underline underline-offset-4"
        >
          Show {Math.min(USER_PAGE, rows.length - shown)} more
        </button>
      ) : null}
    </div>
  )
}
