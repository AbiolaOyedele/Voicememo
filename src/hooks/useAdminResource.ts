'use client'

import { useCallback, useEffect, useState } from 'react'

interface AdminResource<T> {
  data: T | null
  loading: boolean
  error: boolean
  reload: () => void
}

/**
 * Fetch an admin API resource (envelope `{ data }`) with loading/error state
 * and a manual reload. Client-side counterpart to the server-rendered dashboard
 * — used by the swipeable admin panels so they behave like the rest of the app.
 */
export function useAdminResource<T>(url: string): AdminResource<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status))
        const json = (await res.json()) as { data: T }
        setData(json.data)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [url])

  useEffect(load, [load])

  return { data, loading, error, reload: load }
}
