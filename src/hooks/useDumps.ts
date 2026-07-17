'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Dump } from '@/types/dump'
import { clearDumpsCache, readDumpsCache, writeDumpsCache } from '@/lib/dumps-cache'
import { resumeStuckDumps } from '@/lib/dump-recovery'

interface UseDumps {
  dumps: Dump[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  setDumps: React.Dispatch<React.SetStateAction<Dump[]>>
}

/**
 * Fetch the current user's dumps from the API. Exposes the raw list plus a
 * setter for optimistic updates (pin/delete) and a refetch.
 */
export function useDumps(): UseDumps {
  // Seed from the on-device cache so the library paints instantly on repeat
  // visits (and swipes) instead of flashing a skeleton. A background fetch
  // below revalidates. `loading` is only true when we have nothing to show yet.
  const [dumps, setDumps] = useState<Dump[]>(() => readDumpsCache())
  const [loading, setLoading] = useState(() => readDumpsCache().length === 0)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    // Only show the loading state when the list is empty; a warm cache
    // revalidates silently.
    setError(null)
    setLoading((prev) => prev && readDumpsCache().length === 0)
    try {
      const res = await fetch('/api/v1/dumps', { cache: 'no-store' })
      // Not signed in: nothing to show yet — treat as an empty library, not an error.
      // Also purge any cached ideas from a previous account/session on this device.
      if (res.status === 401) {
        clearDumpsCache()
        setDumps([])
        return
      }
      const json = (await res.json().catch(() => null)) as {
        data?: Dump[]
        error?: { message?: string }
      } | null
      if (!res.ok || !json?.data) {
        throw new Error(json?.error?.message ?? 'Failed to load')
      }
      setDumps(json.data)
      // Heal dumps stranded mid-pipeline (e.g. an interrupted guest-note
      // migration). When anything was resumed, the listener below refetches;
      // resumeStuckDumps attempts each dump once per session, so no loop.
      void resumeStuckDumps(json.data).then((changed) => {
        if (changed) window.dispatchEvent(new Event('dumpty:dumps-updated'))
      })
    } catch {
      // Keep any cached list on screen; only surface an error with nothing to show.
      if (readDumpsCache().length === 0) setError('We could not load your library. Try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Mirror every list change (fetch, optimistic pin/delete) into the on-device
  // cache so detail pages and later visits open instantly from it.
  useEffect(() => {
    writeDumpsCache(dumps)
  }, [dumps])

  // Refetch when guest notes finish migrating into the account.
  useEffect(() => {
    const onUpdated = (): void => void load()
    window.addEventListener('dumpty:dumps-updated', onUpdated)
    return () => window.removeEventListener('dumpty:dumps-updated', onUpdated)
  }, [load])

  return { dumps, loading, error, refetch: load, setDumps }
}
