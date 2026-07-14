'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import type { ActionPlan, Dump } from '@/types/dump'
import { Chip } from '@/components/ui/Chip'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useRegisterRefresh } from '@/hooks/useRefreshControl'
import { readCachedDump, upsertCachedDump, removeCachedDump } from '@/lib/dumps-cache'
import { ExportActions } from '@/components/features/library/ExportActions'
import { ReminderSection } from '@/components/features/library/ReminderSection'
import { ChevronDownIcon, ChevronLeftIcon, StarIcon, TrashIcon } from '@/components/ui/icons'
import { formatDuration } from '@/utils/audio'
import { formatDayLabel, formatTime } from '@/utils/date'

type View = 'clean' | 'raw'

export default function DumpDetailPage() {
  const params = useParams<{ dumpId: string }>()
  const router = useRouter()
  const dumpId = params.dumpId

  // Open instantly from the on-device cache — the library list stores full
  // rows, so a tapped/swiped idea renders immediately with no skeleton. The
  // background fetch below revalidates. Only show a spinner on a true cold miss.
  const cached = readCachedDump(dumpId)
  const [dump, setDump] = useState<Dump | null>(cached)
  const [loading, setLoading] = useState(cached === null)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('clean')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    // A warm cache means the page is already on screen — revalidate silently.
    setLoading(readCachedDump(dumpId) === null)
    setError(null)
    try {
      const res = await fetch(`/api/v1/dumps/${dumpId}`, { cache: 'no-store' })
      // A definitive "not for this session" response — evict any stale cached
      // copy rather than leaving it on screen. This matters when a different
      // account has since signed in on this device: a cache entry that belongs
      // to a previous session must never keep rendering after the server says
      // it doesn't belong to the current one.
      if (res.status === 401 || res.status === 404) {
        removeCachedDump(dumpId)
        setDump(null)
        setError(
          res.status === 401 ? 'You need to be signed in to view that idea.' : 'Idea not found.',
        )
        return
      }
      const json = (await res.json().catch(() => null)) as {
        data?: Dump
        error?: { message?: string }
      } | null
      if (!res.ok || !json?.data) throw new Error(json?.error?.message ?? 'Not found')
      setDump(json.data)
      upsertCachedDump(json.data)
    } catch {
      // Only surface an error if we have nothing cached to show.
      if (readCachedDump(dumpId) === null) setError('We could not open that idea.')
    } finally {
      setLoading(false)
    }
  }, [dumpId])

  useEffect(() => {
    void load()
  }, [load])

  useRegisterRefresh(load)

  async function togglePin(): Promise<void> {
    if (!dump) return
    const next = !dump.is_pinned
    const updated = { ...dump, is_pinned: next }
    setDump(updated)
    upsertCachedDump(updated)
    await fetch(`/api/v1/dumps/${dump.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ is_pinned: next }),
    }).catch(() => {
      setDump({ ...dump, is_pinned: dump.is_pinned })
      upsertCachedDump({ ...dump, is_pinned: dump.is_pinned })
    })
  }

  async function remove(): Promise<void> {
    if (!dump) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/dumps/${dump.id}`, { method: 'DELETE' })
      if (res.ok) {
        removeCachedDump(dump.id)
        router.push('/library')
        return
      }
      setError('We could not delete that idea. Try again.')
    } finally {
      setDeleting(false)
      setConfirmingDelete(false)
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-4">
      <div className="flex items-center justify-between">
        <Link href="/library" aria-label="Back to library" className="-m-2 p-2">
          <ChevronLeftIcon size={24} />
        </Link>
        {dump ? (
          <div data-no-print className="flex items-center gap-1">
            <button
              type="button"
              onClick={togglePin}
              aria-label={dump.is_pinned ? 'Unpin' : 'Pin'}
              aria-pressed={dump.is_pinned}
              className="p-2"
            >
              <StarIcon
                size={20}
                filled={dump.is_pinned}
                className={dump.is_pinned ? '' : 'text-muted'}
              />
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              aria-label="Delete idea"
              className="text-muted p-2"
            >
              <TrashIcon size={20} />
            </button>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="text-muted flex flex-1 items-center justify-center py-24">
          <Spinner />
        </div>
      ) : error || !dump ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
          <p className="text-muted text-sm">{error ?? 'Idea not found.'}</p>
          <Link href="/library" className="text-sm underline">
            Back to library
          </Link>
        </div>
      ) : (
        <article className="flex flex-col gap-4 pt-2">
          <header className="flex flex-col gap-1">
            <h1 className="text-2xl tracking-tight">
              {dump.title ?? (dump.status === 'ready' ? 'Untitled idea' : 'Processing…')}
            </h1>
            <p className="text-muted text-xs">
              {formatDayLabel(dump.created_at)} · {formatTime(dump.created_at)} ·{' '}
              {formatDuration(dump.duration_seconds)}
            </p>
          </header>

          {dump.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {dump.tags.map((tag) => (
                <Chip key={tag}>{tag}</Chip>
              ))}
            </div>
          ) : null}

          <DetailToggle view={view} onChange={setView} hasRaw={Boolean(dump.raw_transcript)} />

          {dump.status !== 'ready' && dump.status !== 'failed' ? (
            <p className="text-muted flex items-center gap-2 py-6 text-sm">
              <Spinner size={16} /> Still processing this idea…
            </p>
          ) : view === 'raw' ? (
            <p className="text-ink text-[15px] leading-relaxed whitespace-pre-wrap">
              {dump.raw_transcript || 'No transcript available.'}
            </p>
          ) : dump.segments && dump.segments.length > 0 ? (
            <div className="flex flex-col gap-5">
              {dump.segments.map((seg, i) => (
                <section key={i} className="flex flex-col gap-1.5">
                  <h2 className="text-muted text-xs tracking-wide uppercase">{seg.label}</h2>
                  <p className="text-ink text-[15px] leading-relaxed whitespace-pre-wrap">
                    {seg.content}
                  </p>
                </section>
              ))}
            </div>
          ) : (
            <p className="text-ink text-[15px] leading-relaxed whitespace-pre-wrap">
              {dump.clean_transcript || 'Nothing here yet.'}
            </p>
          )}

          {dump.status === 'ready' ? <ReminderSection dumpId={dump.id} /> : null}
          {dump.status === 'ready' ? <ActionPlanSection dump={dump} onUpdate={setDump} /> : null}
          {dump.status === 'ready' ? <ExportActions dump={dump} /> : null}
        </article>
      )}

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this idea?"
        description="This can't be undone — the recording and its transcript will be gone for good."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmingDelete(false)}
      />
    </main>
  )
}

function DetailToggle({
  view,
  onChange,
  hasRaw,
}: {
  view: View
  onChange: (v: View) => void
  hasRaw: boolean
}) {
  if (!hasRaw) return null
  return (
    <div className="rounded-btn border-ink/10 flex w-fit gap-1 border p-1 text-sm">
      {(['clean', 'raw'] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`rounded-[8px] px-3 py-1 capitalize transition-colors ${
            view === v ? 'bg-flame text-white' : 'text-muted'
          }`}
        >
          {v === 'clean' ? 'Clean' : 'Raw'}
        </button>
      ))}
    </div>
  )
}

/**
 * Action plan: generated on demand (not part of the initial transcript
 * processing) from the dump's cleaned transcript, so most ideas never pay for
 * the extra Claude call. Hidden behind a collapsed toggle until the user
 * chooses to view it, even after it's been generated.
 */
function ActionPlanSection({ dump, onUpdate }: { dump: Dump; onUpdate: (dump: Dump) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate(): Promise<void> {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/dumps/${dump.id}/action-plan`, { method: 'POST' })
      const json = (await res.json().catch(() => null)) as {
        data?: Dump
        error?: { message?: string }
      } | null
      if (!res.ok || !json?.data) throw new Error(json?.error?.message ?? 'Failed')
      onUpdate(json.data)
      setExpanded(true)
    } catch {
      setError('We could not create an action plan. Try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function toggleItem(itemId: string): Promise<void> {
    if (!dump.action_plan) return
    const previous = dump.action_plan
    const next: ActionPlan = {
      ...previous,
      items: previous.items.map((item) =>
        item.id === itemId ? { ...item, done: !item.done } : item,
      ),
    }
    onUpdate({ ...dump, action_plan: next })
    try {
      const res = await fetch(`/api/v1/dumps/${dump.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action_plan: next }),
      })
      if (!res.ok) throw new Error('failed')
    } catch {
      onUpdate({ ...dump, action_plan: previous })
    }
  }

  if (!dump.action_plan) {
    return (
      <div data-no-print className="border-ink/10 flex flex-col gap-2 border-t pt-4">
        <Button variant="secondary" size="md" onClick={generate} disabled={generating}>
          {generating ? 'Generating…' : 'Create action plan'}
        </Button>
        {error ? (
          <p role="alert" className="text-muted text-sm">
            {error}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div data-no-print className="border-ink/10 flex flex-col gap-2 border-t pt-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex min-h-11 items-center justify-between text-left text-[15px]"
      >
        Action plan
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted"
        >
          <ChevronDownIcon size={18} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="items"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <ul className="flex flex-col pb-1">
              {dump.action_plan.items.map((item) => (
                <li key={item.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 py-1">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => void toggleItem(item.id)}
                      className="accent-flame h-5 w-5 shrink-0"
                    />
                    <span className={`text-[15px] ${item.done ? 'text-muted line-through' : ''}`}>
                      {item.text}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => void generate()}
              disabled={generating}
              className="text-muted hover:text-ink min-h-11 self-start text-xs underline underline-offset-4 disabled:opacity-60"
            >
              {generating ? 'Regenerating…' : 'Regenerate'}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {error ? (
        <p role="alert" className="text-muted text-sm">
          {error}
        </p>
      ) : null}
    </div>
  )
}
