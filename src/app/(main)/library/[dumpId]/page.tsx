'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import type { Dump } from '@/types/dump'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PullToRefresh } from '@/components/ui/PullToRefresh'
import { useToast } from '@/components/ui/Toast'
import { useRegisterRefresh } from '@/hooks/useRefreshControl'
import { readCachedDump, upsertCachedDump, removeCachedDump } from '@/lib/dumps-cache'
import { ActionPlanPanel } from '@/components/features/library/ActionPlanPanel'
import { ExportActions } from '@/components/features/library/ExportActions'
import { ReminderSection } from '@/components/features/library/ReminderSection'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FileTextIcon,
  ListChecksIcon,
  PencilIcon,
  StarIcon,
  TrashIcon,
} from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { formatDuration } from '@/utils/audio'
import { formatDayLabel, formatTime } from '@/utils/date'
import { countWords } from '@/utils/text'

type View = 'clean' | 'raw'

/**
 * Dump detail: a two-panel native swipe (same scroll-snap mechanism as the
 * home tabs) — the idea on the left, its action plan as a full page on the
 * right — with its own bottom pill nav: back to library, Idea, Action plan.
 */
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

  // --- Swipe track (mirrors SwipeCarousel/AdminShell mechanics) -------------
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const activeIndexRef = useRef(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let raf = 0
    const onScroll = (): void => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const w = el.clientWidth || 1
        const idx = Math.min(1, Math.max(0, Math.round(el.scrollLeft / w)))
        if (idx !== activeIndexRef.current) {
          activeIndexRef.current = idx
          setActiveIndex(idx)
        }
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onResize = (): void => {
      el.scrollLeft = activeIndexRef.current * el.clientWidth
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const goTo = useCallback((idx: number) => {
    const el = containerRef.current
    if (!el) return
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' })
  }, [])

  // --- Data ------------------------------------------------------------------
  const load = useCallback(async () => {
    // A warm cache means the page is already on screen — revalidate silently.
    setLoading(readCachedDump(dumpId) === null)
    setError(null)
    try {
      const res = await fetch(`/api/v1/dumps/${dumpId}`, { cache: 'no-store' })
      // A definitive "not for this session" response — evict any stale cached
      // copy rather than leaving it on screen (matters when a different account
      // has since signed in on this device).
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

  /** State + cache updates for any dump change (rename, plan edits, pin). */
  const applyUpdate = useCallback((updated: Dump) => {
    setDump(updated)
    upsertCachedDump(updated)
  }, [])

  const toast = useToast()

  // Optimistic PATCH shared by pin and rename: apply the change locally
  // (state + cache) right away, revert both if the server rejects it.
  const patchDump = useCallback(
    async (patch: Partial<Pick<Dump, 'title' | 'is_pinned'>>): Promise<boolean> => {
      if (!dump) return false
      const previous = dump
      applyUpdate({ ...dump, ...patch })
      try {
        const res = await fetch(`/api/v1/dumps/${dump.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(patch),
        })
        if (!res.ok) throw new Error('failed')
        return true
      } catch {
        applyUpdate(previous)
        toast.error('Could not save that change')
        return false
      }
    },
    [dump, applyUpdate, toast],
  )

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

  const panelClass = 'h-full w-full shrink-0 snap-start snap-always'

  return (
    <div className="bg-canvas text-ink relative h-[100dvh] overflow-hidden">
      <div
        ref={containerRef}
        className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
      >
        {/* Panel 1 — the idea */}
        <section className={panelClass}>
          <PullToRefresh>
            <main className="mx-auto flex min-h-full w-full max-w-md flex-col px-4 pt-4 pb-40">
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
                <IdeaPanel
                  dump={dump}
                  view={view}
                  onViewChange={setView}
                  onPatch={patchDump}
                  onDelete={() => setConfirmingDelete(true)}
                  onOpenPlan={() => goTo(1)}
                />
              )}
            </main>
          </PullToRefresh>
        </section>

        {/* Panel 2 — the action plan */}
        <section className={panelClass}>
          <PullToRefresh>
            <main className="mx-auto flex min-h-full w-full max-w-md flex-col px-4 pt-4 pb-40">
              <ActionPlanPanel dump={dump} onUpdate={applyUpdate} active={activeIndex === 1} />
            </main>
          </PullToRefresh>
        </section>
      </div>

      <DetailNav
        activeIndex={activeIndex}
        onGo={goTo}
        onBack={() => router.push('/library')}
      />

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this idea?"
        description="This can't be undone — the recording and its transcript will be gone for good."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  )
}

/** The idea panel's content: header, transcript, reminder, plan row, export. */
function IdeaPanel({
  dump,
  view,
  onViewChange,
  onPatch,
  onDelete,
  onOpenPlan,
}: {
  dump: Dump
  view: View
  onViewChange: (v: View) => void
  onPatch: (patch: Partial<Pick<Dump, 'title' | 'is_pinned'>>) => Promise<boolean>
  onDelete: () => void
  onOpenPlan: () => void
}) {
  const planItems = dump.action_plan?.items ?? []
  const planDone = planItems.filter((i) => i.done).length

  return (
    <>
      <div data-no-print className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => void onPatch({ is_pinned: !dump.is_pinned })}
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
        <button type="button" onClick={onDelete} aria-label="Delete idea" className="text-muted p-2">
          <TrashIcon size={20} />
        </button>
      </div>

      <article className="flex flex-col gap-4 pt-2">
        <header className="flex flex-col gap-1">
          <EditableTitle
            title={dump.title}
            fallback={dump.status === 'ready' ? 'Untitled idea' : 'Processing…'}
            canEdit={dump.status === 'ready'}
            onSave={(title) => onPatch({ title })}
          />
          <p className="text-muted text-xs">
            {formatDayLabel(dump.created_at)} · {formatTime(dump.created_at)} ·{' '}
            {formatDuration(dump.duration_seconds)}
            {dump.status === 'ready' && dump.clean_transcript
              ? ` · ${countWords(dump.clean_transcript)} words`
              : ''}
          </p>
        </header>

        <DetailToggle view={view} onChange={onViewChange} hasRaw={Boolean(dump.raw_transcript)} />

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

        {dump.status === 'ready' ? (
          <button
            type="button"
            data-no-print
            onClick={onOpenPlan}
            className="rounded-btn border-ink/10 hover:bg-ink/[0.03] flex min-h-12 items-center justify-between gap-3 border px-4 transition-colors"
          >
            <span className="flex items-center gap-2 text-[15px]">
              <ListChecksIcon size={18} className="text-flame" />
              Action plan
              {planItems.length > 0 ? (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs tabular-nums',
                    planDone === planItems.length ? 'bg-flame text-white' : 'bg-ink/5 text-muted',
                  )}
                >
                  {planDone}/{planItems.length}
                </span>
              ) : (
                <span className="text-muted text-xs">Generate</span>
              )}
            </span>
            <ChevronRightIcon size={18} className="text-muted" />
          </button>
        ) : null}

        {dump.status === 'ready' ? <ExportActions dump={dump} /> : null}
      </article>
    </>
  )
}

const DETAIL_TABS = [
  { label: 'Thoughts', Icon: FileTextIcon },
  { label: 'Action plan', Icon: ListChecksIcon },
] as const

/**
 * Bottom pill nav for the detail pair — same look and spring as the app's
 * TabBar: a back control on the left, then Idea and Action plan entries whose
 * labels expand as they become active.
 */
function DetailNav({
  activeIndex,
  onGo,
  onBack,
}: {
  activeIndex: number
  onGo: (idx: number) => void
  onBack: () => void
}) {
  return (
    <>
      {/* Fade the page out behind the floating nav — same as TabBar. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-[calc(env(safe-area-inset-bottom)+8.5rem)]"
        style={{
          background:
            'linear-gradient(to top, var(--color-canvas) 0%, var(--color-canvas) 35%, transparent 100%)',
        }}
      />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1.75rem)]">
        <motion.nav
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          aria-label="Thought sections"
          className="border-ink/10 bg-canvas pointer-events-auto flex items-center gap-1 rounded-full border p-1.5"
        >
          <motion.button
            type="button"
            onClick={onBack}
            whileTap={{ scale: 0.96 }}
            aria-label="Back to library"
            className="text-muted hover:bg-ink/5 flex h-11 min-w-11 items-center justify-center rounded-full px-3 transition-colors"
          >
            <ChevronLeftIcon size={22} />
          </motion.button>

          {DETAIL_TABS.map(({ label, Icon }, i) => {
            const active = activeIndex === i
            return (
              <motion.button
                key={label}
                type="button"
                onClick={() => onGo(i)}
                whileTap={{ scale: 0.96 }}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-11 min-w-11 items-center justify-center rounded-full px-3 transition-colors',
                  active ? 'bg-flame/12 text-flame' : 'text-muted hover:bg-ink/5',
                )}
              >
                <Icon size={22} />
                <motion.span
                  initial={false}
                  animate={{
                    width: active ? 'auto' : 0,
                    opacity: active ? 1 : 0,
                    marginLeft: active ? 8 : 0,
                  }}
                  transition={{
                    width: { type: 'spring', stiffness: 350, damping: 32 },
                    opacity: { duration: 0.18 },
                  }}
                  className="overflow-hidden text-sm whitespace-nowrap"
                >
                  {label}
                </motion.span>
              </motion.button>
            )
          })}
        </motion.nav>
      </div>
    </>
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
