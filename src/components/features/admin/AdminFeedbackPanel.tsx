'use client'

import { useAdminResource } from '@/hooks/useAdminResource'
import type { FeedbackRecord } from '@/types/feedback'
import { PanelLoading, PanelError, fmtDate } from './adminUi'
import { BackToAppButton } from './BackToAppButton'

interface FeedbackData {
  items: FeedbackRecord[]
  count: number
}

const TYPE_EMOJI: Record<FeedbackRecord['type'], string> = {
  bug: '🐞',
  feature: '✨',
  other: '💬',
}

export function AdminFeedbackPanel() {
  const { data, loading, error, reload } = useAdminResource<FeedbackData>('/api/v1/admin/feedback')

  if (loading) return <PanelLoading />
  if (error || !data) return <PanelError onRetry={reload} />

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-muted text-xs font-medium tracking-wide uppercase">
        Feedback {data.count > 0 ? `· ${data.count.toLocaleString()}` : ''}
      </h2>
      {data.items.length === 0 ? (
        <p className="text-muted text-sm">No feedback yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.items.map((f) => (
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
      <BackToAppButton />
    </div>
  )
}
