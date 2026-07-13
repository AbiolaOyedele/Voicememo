import { getDashboardData } from '@/services/admin.service'
import { PushBroadcaster } from '@/components/features/admin/PushBroadcaster'
import type { FeedbackRecord } from '@/types/feedback'
import type { RecentSignup } from '@/types/admin'

// Always render fresh — this is a live operational dashboard, never cached.
export const dynamic = 'force-dynamic'

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border-ink/10 border p-4">
      <div className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</div>
      <div className="text-muted mt-1 text-xs">{label}</div>
    </div>
  )
}

const TYPE_EMOJI: Record<FeedbackRecord['type'], string> = {
  bug: '🐞',
  feature: '✨',
  other: '💬',
}

export default async function HumptyDashboard() {
  const { users, feedback, feedbackCount, pushSubscriberCount } = await getDashboardData()

  return (
    <div className="flex flex-col gap-8">
      {/* Metrics */}
      <section>
        <h2 className="text-muted mb-3 text-xs font-medium tracking-wide uppercase">Users</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Total users" value={users.totalUsers} />
          <StatTile label="New today" value={users.signupsToday} />
          <StatTile label="Last 7 days" value={users.signups7d} />
          <StatTile label="Last 30 days" value={users.signups30d} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Push subscribers" value={pushSubscriberCount} />
          <StatTile label="Feedback total" value={feedbackCount} />
        </div>
      </section>

      {/* Recent signups */}
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

      {/* Marketing / push */}
      <section>
        <h2 className="text-muted mb-3 text-xs font-medium tracking-wide uppercase">
          Marketing — send a push
        </h2>
        <PushBroadcaster subscriberCount={pushSubscriberCount} />
      </section>

      {/* Recent feedback */}
      <section>
        <h2 className="text-muted mb-3 text-xs font-medium tracking-wide uppercase">
          Recent feedback
        </h2>
        {feedback.length === 0 ? (
          <p className="text-muted text-sm">No feedback yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {feedback.map((f) => (
              <li key={f.id} className="rounded-card border-ink/10 border p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm">
                    {TYPE_EMOJI[f.type]} {f.type}
                  </span>
                  <span className="text-muted text-xs">{fmtDate(f.createdAt)}</span>
                </div>
                <p className="mt-2 text-[15px] whitespace-pre-wrap">{f.message}</p>
                {f.pageUrl ? <p className="text-muted mt-2 text-xs">{f.pageUrl}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
