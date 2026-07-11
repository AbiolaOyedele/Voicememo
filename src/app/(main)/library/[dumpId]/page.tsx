'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Dump } from '@/types/dump'
import { Chip } from '@/components/ui/Chip'
import { Spinner } from '@/components/ui/Spinner'
import { ChevronLeftIcon, StarIcon, TrashIcon } from '@/components/ui/icons'
import { formatDuration } from '@/utils/audio'
import { formatDayLabel, formatTime } from '@/utils/date'

type View = 'clean' | 'raw'

export default function DumpDetailPage() {
  const params = useParams<{ dumpId: string }>()
  const router = useRouter()
  const dumpId = params.dumpId

  const [dump, setDump] = useState<Dump | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('clean')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/dumps/${dumpId}`, { cache: 'no-store' })
      const json = (await res.json().catch(() => null)) as {
        data?: Dump
        error?: { message?: string }
      } | null
      if (!res.ok || !json?.data) throw new Error(json?.error?.message ?? 'Not found')
      setDump(json.data)
    } catch {
      setError('We could not open that idea.')
    } finally {
      setLoading(false)
    }
  }, [dumpId])

  useEffect(() => {
    void load()
  }, [load])

  async function togglePin(): Promise<void> {
    if (!dump) return
    const next = !dump.is_pinned
    setDump({ ...dump, is_pinned: next })
    await fetch(`/api/v1/dumps/${dump.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ is_pinned: next }),
    }).catch(() => setDump({ ...dump, is_pinned: dump.is_pinned }))
  }

  async function remove(): Promise<void> {
    if (!dump) return
    if (!window.confirm('Delete this idea? This cannot be undone.')) return
    const res = await fetch(`/api/v1/dumps/${dump.id}`, { method: 'DELETE' })
    if (res.ok) router.push('/library')
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-4">
      <div className="flex items-center justify-between">
        <Link href="/library" aria-label="Back to library" className="-m-2 p-2">
          <ChevronLeftIcon size={24} />
        </Link>
        {dump ? (
          <div className="flex items-center gap-1">
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
              onClick={remove}
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
          <Link href="/library" className="text-sm font-medium underline">
            Back to library
          </Link>
        </div>
      ) : (
        <article className="flex flex-col gap-4 pt-2">
          <header className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">
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
                  <h2 className="text-muted text-xs font-semibold tracking-wide uppercase">
                    {seg.label}
                  </h2>
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
        </article>
      )}
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
          className={`rounded-[8px] px-3 py-1 font-medium capitalize transition-colors ${
            view === v ? 'bg-ink text-canvas' : 'text-muted'
          }`}
        >
          {v === 'clean' ? 'Clean' : 'Raw'}
        </button>
      ))}
    </div>
  )
}
