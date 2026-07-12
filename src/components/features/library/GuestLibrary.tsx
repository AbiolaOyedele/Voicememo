'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { listGuestDumps, deleteGuestDump, type GuestDump } from '@/lib/guest'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** A single guest note with inline audio playback and delete. */
function GuestNote({ dump, onDelete }: { dump: GuestDump; onDelete: (id: string) => void }) {
  const url = useMemo(() => URL.createObjectURL(dump.blob), [dump.blob])
  useEffect(() => () => URL.revokeObjectURL(url), [url])

  return (
    <li className="rounded-card border-ink/10 flex flex-col gap-3 border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{dump.title}</p>
          <p className="text-muted text-xs">{formatDuration(dump.durationSeconds)}</p>
        </div>
        <button
          type="button"
          onClick={() => onDelete(dump.id)}
          className="text-muted hover:text-ink min-h-11 shrink-0 text-sm underline underline-offset-4"
          aria-label={`Delete ${dump.title}`}
        >
          Delete
        </button>
      </div>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio controls src={url} className="w-full" />
    </li>
  )
}

/**
 * Library for guest sessions. Reads audio-only notes from local browser storage
 * (IndexedDB) — guests get no server transcription. Handles loading, empty, and
 * populated states.
 */
export function GuestLibrary() {
  const [dumps, setDumps] = useState<GuestDump[] | null>(null)

  const load = useCallback(async () => {
    try {
      setDumps(await listGuestDumps())
    } catch {
      setDumps([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleDelete(id: string): Promise<void> {
    setDumps((prev) => prev?.filter((d) => d.id !== id) ?? null)
    try {
      await deleteGuestDump(id)
    } catch {
      void load()
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pt-6">
      <h1 className="px-1 text-2xl font-bold tracking-tight">Library</h1>

      <div className="rounded-card border-ink/10 flex flex-col gap-3 border p-4">
        <p className="text-sm">
          You&apos;re a guest — these notes live on this device only. Create a free account to keep
          them: they&apos;ll be transcribed, cleaned up, and synced to your library.
        </p>
        <Link href="/login" className="w-full">
          <motion.span
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="rounded-btn bg-flame flex h-11 w-full items-center justify-center px-5 font-medium text-white"
          >
            Create a free account
          </motion.span>
        </Link>
      </div>
      <p className="text-muted px-1 text-xs">
        Your existing notes move over to your account automatically when you sign in.
      </p>

      {dumps === null ? (
        <div className="flex flex-col gap-2" aria-hidden>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-card border-ink/10 bg-ink/[0.04] h-28 animate-pulse border"
            />
          ))}
        </div>
      ) : dumps.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <p className="text-lg font-semibold">No notes yet</p>
          <p className="text-muted max-w-xs text-sm">
            Tap Record to capture your first note. It stays private on this device.
          </p>
          <Link
            href="/record"
            className="rounded-btn bg-flame mt-2 inline-flex h-11 items-center px-5 font-medium text-white"
          >
            Record a note
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {dumps.map((d) => (
            <GuestNote key={d.id} dump={d} onDelete={handleDelete} />
          ))}
        </ul>
      )}
    </main>
  )
}
