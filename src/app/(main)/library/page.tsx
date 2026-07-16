'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTabNav } from '@/hooks/useTabCarousel'
import { motion } from 'framer-motion'
import type { Dump } from '@/types/dump'
import { useDumps } from '@/hooks/useDumps'
import { isGuest } from '@/lib/guest'
import { DumpList } from '@/components/features/library/DumpList'
import { GuestLibrary } from '@/components/features/library/GuestLibrary'
import { SearchBar } from '@/components/features/library/SearchBar'
import { Chip } from '@/components/ui/Chip'
import { Button } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { useRegisterRefresh } from '@/hooks/useRefreshControl'

/** Routes guests to the local library and signed-in users to the synced one. */
export default function LibraryPage() {
  const [guest, setGuest] = useState<boolean | null>(null)
  useEffect(() => setGuest(isGuest()), [])
  if (guest === null) return null
  return guest ? <GuestLibrary /> : <SignedInLibrary />
}

function matchesQuery(dump: Dump, q: string): boolean {
  const haystack = [dump.title, dump.clean_transcript, dump.raw_transcript, dump.tags.join(' ')]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

function SignedInLibrary() {
  const { dumps, loading, error, refetch, setDumps } = useDumps()
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [showAllTags, setShowAllTags] = useState(false)
  useRegisterRefresh(refetch)

  // Tags ordered by popularity (how many ideas use each), then alphabetically.
  const allTags = useMemo(() => {
    const counts = new Map<string, number>()
    dumps.forEach((d) => d.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)))
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag]) => tag)
  }, [dumps])

  // Collapse to the most popular few; the rest hide behind a "more" toggle.
  const TAG_LIMIT = 8
  const visibleTags = useMemo(() => {
    if (showAllTags) return allTags
    const top = allTags.slice(0, TAG_LIMIT)
    // Keep the active tag visible even if it isn't in the popular set.
    if (activeTag && !top.includes(activeTag)) top.push(activeTag)
    return top
  }, [allTags, showAllTags, activeTag])
  const hiddenCount = allTags.length - visibleTags.length

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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-6">
      <div className="flex flex-col gap-4">
        <Reveal>
          <h1 className="px-1 text-2xl tracking-tight">Library</h1>
        </Reveal>

        <Reveal delay={0.04}>
          <SearchBar value={query} onChange={setQuery} />
        </Reveal>

        {allTags.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap gap-1.5"
          >
            <Chip active={activeTag === null} onClick={() => setActiveTag(null)}>
              All
            </Chip>
            {visibleTags.map((tag) => (
              <Chip key={tag} active={activeTag === tag} onClick={() => setActiveTag(tag)}>
                {tag}
              </Chip>
            ))}
            {hiddenCount > 0 ? (
              <Chip onClick={() => setShowAllTags(true)}>+{hiddenCount} more</Chip>
            ) : showAllTags && allTags.length > TAG_LIMIT ? (
              <Chip onClick={() => setShowAllTags(false)}>Show less</Chip>
            ) : null}
          </motion.div>
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
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-muted text-sm">
              {activeTag && query.trim()
                ? 'No ideas match your search and tag filter.'
                : activeTag
                  ? `No ideas tagged “${activeTag}”.`
                  : 'No ideas match your search.'}
            </p>
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setQuery('')
                setActiveTag(null)
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <DumpList dumps={filtered} onTogglePin={togglePin} />
        )}
      </div>
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
  const goToTab = useTabNav()
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-3 py-20 text-center"
    >
      <p className="text-lg">No ideas yet</p>
      <p className="text-muted max-w-xs text-sm">
        Tap Record to capture your first idea. Your clean, segmented version shows up here.
      </p>
      <button
        type="button"
        onClick={() => goToTab('/record')}
        className="rounded-btn bg-flame mt-2 inline-flex h-11 items-center px-5 text-white"
      >
        Record an idea
      </button>
    </motion.div>
  )
}
