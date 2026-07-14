'use client'

import { useEffect, useState } from 'react'
import type { ReminderSummary } from '@/types/api'
import { BellIcon } from '@/components/ui/icons'
import { formatDayLabel, formatTime } from '@/utils/date'

/**
 * Shows the reminder detected for this idea at transcription time, if any,
 * with a way to cancel it. Renders nothing when there's no reminder — most
 * ideas don't have one, so an empty state would just be noise.
 */
export function ReminderSection({ dumpId }: { dumpId: string }) {
  const [reminder, setReminder] = useState<ReminderSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load(): Promise<void> {
      try {
        const res = await fetch(`/api/v1/dumps/${dumpId}/reminder`, { cache: 'no-store' })
        const json = (await res.json().catch(() => null)) as { data?: ReminderSummary | null } | null
        if (!cancelled) setReminder(json?.data ?? null)
      } catch {
        // Ancillary — a failed fetch just means the section stays hidden.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [dumpId])

  async function cancel(): Promise<void> {
    if (!reminder) return
    const previous = reminder
    setCancelling(true)
    setError(null)
    setReminder(null)
    try {
      const res = await fetch(`/api/v1/dumps/${dumpId}/reminder`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Request failed')
    } catch {
      setReminder(previous)
      setError('We could not cancel that reminder. Try again.')
    } finally {
      setCancelling(false)
    }
  }

  if (loading || !reminder || reminder.status !== 'pending') return null

  return (
    <div data-no-print className="border-ink/10 flex flex-col gap-2 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-[15px]">
          <BellIcon size={18} className="text-muted shrink-0" />
          <span>
            Reminder set for {formatDayLabel(reminder.remind_at)}, {formatTime(reminder.remind_at)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void cancel()}
          disabled={cancelling}
          className="text-muted hover:text-ink min-h-11 shrink-0 px-2 text-xs underline underline-offset-4 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-muted text-sm">
          {error}
        </p>
      ) : null}
    </div>
  )
}
