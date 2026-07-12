'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Dump } from '@/types/dump'

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
  const [dumps, setDumps] = useState<Dump[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/dumps', { cache: 'no-store' })
      // Not signed in: nothing to show yet — treat as an empty library, not an error.
      if (res.status === 401) {
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
    } catch {
      setError('We could not load your library. Try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Refetch when guest notes finish migrating into the account.
  useEffect(() => {
    const onUpdated = (): void => void load()
    window.addEventListener('dumpty:dumps-updated', onUpdated)
    return () => window.removeEventListener('dumpty:dumps-updated', onUpdated)
  }, [load])

  return { dumps, loading, error, refetch: load, setDumps }
}
