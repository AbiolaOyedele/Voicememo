'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAdminResource } from '@/hooks/useAdminResource'
import type { FeedbackRecord } from '@/types/feedback'
import { PanelLoading, PanelError, PanelHeader, fmtDate } from './adminUi'
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

/**
 * Feedback worked as a todo list: check an item off when it's handled, or send
 * a short reply. Both actions deliver an in-app message to the submitter's
 * Account tab (guest submissions update silently).
 */
export function AdminFeedbackPanel() {
  const { data, loading, error, reload } = useAdminResource<FeedbackData>('/api/v1/admin/feedback')
  const [items, setItems] = useState<FeedbackRecord[]>([])
  useEffect(() => {
    if (data) setItems(data.items)
  }, [data])

  if (loading && items.length === 0) return <PanelLoading />
  if (error || !data) return <PanelError onRetry={reload} />

  function patchLocal(updated: FeedbackRecord): void {
    setItems((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
  }

  const open = items.filter((f) => f.status !== 'done')
  const done = items.filter((f) => f.status === 'done')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <PanelHeader title="Feedback" onRefresh={reload} refreshing={loading} />
        <p className="text-muted text-xs">
          {open.length.toLocaleString()} open · {done.length.toLocaleString()} done · checking off
          or replying notifies the sender in their Account tab.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-muted text-sm">No feedback yet.</p>
      ) : (
        <>
          <FeedbackGroup title="To do" items={open} onUpdated={patchLocal} emptyNote="All clear 🎉" />
          {done.length > 0 ? (
            <FeedbackGroup title="Done" items={done} onUpdated={patchLocal} />
          ) : null}
        </>
      )}

      <BackToAppButton />
    </div>
  )
}

function FeedbackGroup({
  title,
  items,
  onUpdated,
  emptyNote,
}: {
  title: string
  items: FeedbackRecord[]
  onUpdated: (f: FeedbackRecord) => void
  emptyNote?: string
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-muted text-xs font-medium tracking-wide uppercase">
        {title} · {items.length.toLocaleString()}
      </h3>
      {items.length === 0 && emptyNote ? (
        <p className="text-muted text-sm">{emptyNote}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((f) => (
            <FeedbackItem key={f.id} item={f} onUpdated={onUpdated} />
          ))}
        </ul>
      )}
    </section>
  )
}

function FeedbackItem({
  item,
  onUpdated,
}: {
  item: FeedbackRecord
  onUpdated: (f: FeedbackRecord) => void
}) {
  const [busy, setBusy] = useState(false)
  const [replying, setReplying] = useState(false)
  const [draft, setDraft] = useState('')
  const [failed, setFailed] = useState(false)
  const isDone = item.status === 'done'

  async function patch(body: { done?: boolean; response?: string }): Promise<void> {
    setBusy(true)
    setFailed(false)
    try {
      const res = await fetch(`/api/v1/admin/feedback/${item.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = (await res.json().catch(() => null)) as { data?: FeedbackRecord } | null
      if (!res.ok || !json?.data) throw new Error('failed')
      onUpdated(json.data)
      setReplying(false)
      setDraft('')
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className={`rounded-card border-ink/10 border p-4 ${isDone ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isDone}
          disabled={busy}
          onChange={() => void patch({ done: !isDone })}
          aria-label={isDone ? 'Reopen this feedback' : 'Mark this feedback done'}
          className="accent-flame mt-0.5 h-5 w-5 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">
              {TYPE_EMOJI[item.type]} {item.type}
              {item.userId === null ? <span className="text-muted"> · guest</span> : null}
            </span>
            <span className="text-muted shrink-0 text-xs">{fmtDate(item.createdAt)}</span>
          </div>
          <p className={`mt-1.5 text-[15px] whitespace-pre-wrap ${isDone ? 'line-through' : ''}`}>
            {item.message}
          </p>
          {item.pageUrl ? <p className="text-muted mt-1.5 text-xs">{item.pageUrl}</p> : null}

          {item.response ? (
            <p className="border-flame/40 text-muted mt-2 border-l-2 pl-3 text-sm">
              Replied: {item.response}
            </p>
          ) : null}

          <AnimatePresence initial={false}>
            {replying ? (
              <motion.div
                key="reply"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder={
                    item.userId
                      ? 'Write a reply — it appears in their Account tab.'
                      : 'Guest feedback — a reply is stored but cannot be delivered.'
                  }
                  className="border-ink/15 focus:border-ink placeholder:text-muted mt-2 w-full rounded-lg border bg-transparent p-3 text-sm outline-none"
                />
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    disabled={busy || !draft.trim()}
                    onClick={() => void patch({ response: draft.trim() })}
                    className="rounded-btn bg-flame min-h-9 px-3 text-sm text-white disabled:opacity-50"
                  >
                    {busy ? 'Sending…' : 'Send reply'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplying(false)}
                    className="text-muted min-h-9 px-2 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDraft(item.response ?? '')
                  setReplying(true)
                }}
                className="text-muted hover:text-ink mt-1 min-h-9 text-xs underline underline-offset-4"
              >
                {item.response ? 'Edit reply' : 'Reply'}
              </button>
            )}
          </AnimatePresence>

          {failed ? (
            <p role="alert" className="text-muted mt-1 text-xs">
              That did not save. Try again.
            </p>
          ) : null}
        </div>
      </div>
    </li>
  )
}
