'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Dump } from '@/types/dump'
import { useDumps } from '@/hooks/useDumps'
import { DumpList } from '@/components/features/library/DumpList'
import { SearchBar } from '@/components/features/library/SearchBar'
import { Chip } from '@/components/ui/Chip'
import { Button } from '@/components/ui/Button'

function matchesQuery(dump: Dump, q: string): boolean {
  const haystack = [dump.title, dump.clean_transcript, dump.raw_transcript, dump.tags.join(' ')]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

export default function LibraryPage() {
  const { dumps, loading, error, refetch, setDumps } = useDumps()
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const allTags = useMemo(() => {
    const set = new Set<string>()
    dumps.forEach((d) => d.tags.forEach((t) => set.add(t)))
    return Array.from(set).sort()
  }, [dumps])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return dumps.filter((d) => {
      if (activeTag && !d.tags.includes(activeTag)) return false
      if (q && !matchesQuery(d, q)) return false
      return true
    })
  }, [dumps, query, activeTag])

  async function togglePin(dump: Dump): Promise<void> {
    const next = !dump.is_pinned
    setDumps((prev) => prev.map((d) => (d.id === dump.id ? { ...d, is_pinned: next } : d)))
    try {
      const res = await fetch(`/api/v1/dumps/${dump.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ is_pinned: next }),
      })
      if (!res.ok) throw new Error('failed')
    } catch {
      setDumps((prev) =>
        prev.map((d) => (d.id === dump.id ? { ...d, is_pinned: dump.is_pinned } : d)),
      )
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pt-6">
      <h1 className="px-1 text-2xl font-bold tracking-tight">Library</h1>

      <SearchBar value={query} onChange={setQuery} />

      {allTags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          <Chip active={activeTag === null} onClick={() => setActiveTag(null)}>
            All
          </Chip>
          {allTags.map((tag) => (
            <Chip key={tag} active={activeTag === tag} onClick={() => setActiveTag(tag)}>
              {tag}
            </Chip>
          ))}
        </div>
      ) : null}

      {loading ? (
        <LibrarySkeleton />
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-muted text-sm">{error}</p>
          <Button variant="secondary" size="md" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : dumps.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <p className="text-muted py-16 text-center text-sm">No ideas match your search.</p>
      ) : (
        <DumpList dumps={filtered} onTogglePin={togglePin} />
      )}
    </main>
  )
}

function LibrarySkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-card border-ink/10 bg-ink/[0.04] h-24 animate-pulse border"
        />
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <p className="text-lg font-semibold">No ideas yet</p>
      <p className="text-muted max-w-xs text-sm">
        Tap Record to capture your first idea. Your clean, segmented version shows up here.
      </p>
      <Link
        href="/record"
        className="rounded-btn bg-ink text-canvas mt-2 inline-flex h-11 items-center px-5 font-medium"
      >
        Record an idea
      </Link>
    </div>
  )
}
