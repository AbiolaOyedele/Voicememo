'use client'

import { useCallback, useEffect, useState } from 'react'
import { getQueuedRecordings, queuedCount, removeQueuedRecording } from '@/lib/offline-queue'
import { uploadRecording } from '@/lib/upload-client'

interface UseOfflineSync {
  pending: number
  syncing: boolean
  flush: () => Promise<void>
  refresh: () => Promise<void>
}

/**
 * Watches connectivity and flushes the offline recording queue through the
 * normal upload pipeline when back online. Items that fail stay queued for the
 * next attempt. Safe to mount once app-wide.
 */
export function useOfflineSync(): UseOfflineSync {
  const [pending, setPending] = useState(0)
  const [syncing, setSyncing] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setPending(await queuedCount())
    } catch {
      // IndexedDB unavailable — nothing to report.
    }
  }, [])

  const flush = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    setSyncing(true)
    let uploadedAny = false
    try {
      const items = await getQueuedRecordings()
      for (const item of items) {
        try {
          await uploadRecording(item)
          await removeQueuedRecording(item.id)
          uploadedAny = true
        } catch {
          // Keep it queued and try again on the next online event.
        }
      }
    } catch {
      // No queue / IndexedDB unavailable.
    } finally {
      setSyncing(false)
      await refresh()
      // Nudge the (already-mounted) library to reload if anything landed.
      if (uploadedAny) window.dispatchEvent(new Event('dumpty:dumps-updated'))
    }
  }, [refresh])

  useEffect(() => {
    void refresh()
    void flush()
    const onOnline = () => void flush()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [flush, refresh])

  return { pending, syncing, flush, refresh }
}
