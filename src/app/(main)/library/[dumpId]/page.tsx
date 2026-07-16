'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import type { ActionPlan, Dump } from '@/types/dump'
import { Chip } from '@/components/ui/Chip'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { useRegisterRefresh } from '@/hooks/useRefreshControl'
import { readCachedDump, upsertCachedDump, removeCachedDump } from '@/lib/dumps-cache'
import { ExportActions } from '@/components/features/library/ExportActions'
import { ReminderSection } from '@/components/features/library/ReminderSection'
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  PencilIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
  XIcon,
} from '@/components/ui/icons'
import { formatDuration } from '@/utils/audio'
import { formatDayLabel, formatTime } from '@/utils/date'
import { countWords } from '@/utils/text'

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

  const toast = useToast()

  // Optimistic PATCH shared by pin, rename, and tag edits: apply the change
  // locally (state + cache) right away, revert both if the server rejects it.
  const patchDump = useCallback(
    async (patch: Partial<Pick<Dump, 'title' | 'tags' | 'is_pinned'>>): Promise<boolean> => {
      if (!dump) return false
      const previous = dump
      const updated = { ...dump, ...patch }
      setDump(updated)
      upsertCachedDump(updated)
      try {
        const res = await fetch(`/api/v1/dumps/${dump.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(patch),
        })
        if (!res.ok) throw new Error('failed')
        return true
      } catch {
        setDump(previous)
        upsertCachedDump(previous)
        toast.error('Could not save that change')
        return false
      }
    },
    [dump, toast],
  )

  async function togglePin(): Promise<void> {
    if (!dump) return
    await patchDump({ is_pinned: !dump.is_pinned })
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
            <EditableTitle
              title={dump.title}
              fallback={dump.status === 'ready' ? 'Untitled idea' : 'Processing…'}
              canEdit={dump.status === 'ready'}
              onSave={(title) => patchDump({ title })}
            />
            <p className="text-muted text-xs">
              {formatDayLabel(dump.created_at)} · {formatTime(dump.created_at)} ·{' '}
              {formatDuration(dump.duration_seconds)}
              {dump.status === 'ready' && dump.clean_transcript
                ? ` · ${countWords(dump.clean_transcript)} words`
                : ''}
            </p>
          </header>

          <TagEditor
            tags={dump.tags}
            canEdit={dump.status === 'ready'}
            onSave={(tags) => patchDump({ tags })}
          />

          <DetailToggle view={view} onChange={setView} hasRaw={Boolean(dump.raw_transcript)} />

          {dump.status !== 'ready' && dump.status !== 'failed' ? (
            <p className="text-muted flex items-center gap-2 py-6 text-sm">
              <Spinner size={16} /> Still processing this idea…
            </p>
          ) : dump.status === 'failed' && view === 'clean' ? (
            <div className="rounded-card border-ink/10 bg-ink/[0.03] flex flex-col gap-1 border p-4">
              <p className="text-[15px]">We could not process this recording</p>
              <p className="text-muted text-sm">
                Something went wrong while turning it into a clean transcript.
                {dump.raw_transcript
                  ? ' The raw transcript is still available above.'
                  : ' Try recording the idea again.'}
              </p>
            </div>
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

/**
 * Idea title with tap-to-rename. The pencil swaps the heading for an input;
 * Enter or Save commits (via the shared optimistic PATCH), Escape cancels.
 * Clearing the text saves `null` so the "Untitled idea" fallback returns.
 */
function EditableTitle({
  title,
  fallback,
  canEdit,
  onSave,
}: {
  title: string | null
  fallback: string
  canEdit: boolean
  onSave: (title: string | null) => Promise<boolean>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEditing(): void {
    setDraft(title ?? '')
    setEditing(true)
  }

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  async function save(): Promise<void> {
    const next = draft.trim().slice(0, 150) || null
    if (next === title) {
      setEditing(false)
      return
    }
    setSaving(true)
    await onSave(next)
    setSaving(false)
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-2xl tracking-tight">{title ?? fallback}</h1>
        {canEdit ? (
          <button
            type="button"
            onClick={startEditing}
            aria-label="Rename idea"
            className="text-muted hover:text-ink -m-2 mt-0 shrink-0 p-3 transition-colors"
          >
            <PencilIcon size={16} />
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="text"
        value={draft}
        maxLength={150}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void save()
          if (e.key === 'Escape') setEditing(false)
        }}
        placeholder="Untitled idea"
        aria-label="Idea title"
        className="rounded-btn border-ink/15 placeholder:text-muted focus:border-ink h-11 w-full border bg-transparent px-3 text-xl tracking-tight outline-none"
      />
      <div className="flex gap-2">
        <Button size="md" onClick={() => void save()} loading={saving}>
          Save
        </Button>
        <Button variant="ghost" size="md" onClick={() => setEditing(false)} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

/**
 * Tag list with an edit mode: each chip gains a remove control and an input
 * appears for adding new tags. Every add/remove saves immediately through the
 * shared optimistic PATCH, so there's no separate commit step — "Done" just
 * leaves edit mode.
 */
function TagEditor({
  tags,
  canEdit,
  onSave,
}: {
  tags: string[]
  canEdit: boolean
  onSave: (tags: string[]) => Promise<boolean>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const MAX_TAGS = 20

  async function addTag(): Promise<void> {
    const tag = draft.trim().toLowerCase().slice(0, 40)
    setDraft('')
    if (!tag || tags.includes(tag) || tags.length >= MAX_TAGS) return
    await onSave([...tags, tag])
  }

  async function removeTag(tag: string): Promise<void> {
    await onSave(tags.filter((t) => t !== tag))
  }

  if (!canEdit) {
    if (tags.length === 0) return null
    return (
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <Chip key={tag}>{tag}</Chip>
        ))}
      </div>
    )
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <Chip key={tag}>{tag}</Chip>
        ))}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-muted hover:text-ink inline-flex min-h-11 items-center gap-1 px-1 text-xs transition-colors"
        >
          <PencilIcon size={12} />
          {tags.length === 0 ? 'Add tags' : 'Edit tags'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <Chip key={tag} className="pr-1.5">
            {tag}
            <button
              type="button"
              onClick={() => void removeTag(tag)}
              aria-label={`Remove tag ${tag}`}
              className="-m-1 p-1"
            >
              <XIcon size={12} />
            </button>
          </Chip>
        ))}
        {tags.length === 0 ? <span className="text-muted text-xs">No tags yet</span> : null}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          maxLength={40}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void addTag()
            }
            if (e.key === 'Escape') setEditing(false)
          }}
          placeholder="Add a tag"
          aria-label="Add a tag"
          className="rounded-btn border-ink/15 placeholder:text-muted focus:border-ink h-11 w-full max-w-[200px] border bg-transparent px-3 text-sm outline-none"
        />
        <button
          type="button"
          onClick={() => void addTag()}
          disabled={!draft.trim()}
          aria-label="Add tag"
          className="rounded-btn border-ink/15 text-ink hover:bg-ink/[0.04] flex h-11 w-11 shrink-0 items-center justify-center border transition-colors disabled:opacity-40"
        >
          <PlusIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-muted hover:text-ink min-h-11 px-1 text-sm underline underline-offset-4 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
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
