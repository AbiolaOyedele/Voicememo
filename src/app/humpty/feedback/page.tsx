import { getFeedback } from '@/services/admin.service'
import type { FeedbackRecord } from '@/types/feedback'

export const dynamic = 'force-dynamic'

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const TYPE_EMOJI: Record<FeedbackRecord['type'], string> = {
  bug: '🐞',
  feature: '✨',
  other: '💬',
}

export default async function HumptyFeedback() {
  const { items, count } = await getFeedback()

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-muted text-xs font-medium tracking-wide uppercase">
        Feedback {count > 0 ? `· ${count.toLocaleString()}` : ''}
      </h2>
      {items.length === 0 ? (
        <p className="text-muted text-sm">No feedback yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((f) => (
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
    </div>
  )
}
