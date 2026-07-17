'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReminderSummary } from '@/types/api'
import { CenterDialog } from '@/components/ui/CenterDialog'
import { Button } from '@/components/ui/Button'
import { BellIcon, PlusIcon } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { formatDayLabel, formatTime } from '@/utils/date'

const MAX_REMINDERS = 2

/**
 * Reminders on an idea: voice-detected ones from transcription plus user-set
 * ones, up to two pending at a time. Each shows as a highlighted flame card
 * with cancel; "Add reminder" opens a fully custom day/time picker (no native
 * datetime inputs).
 */
export function ReminderSection({ dumpId }: { dumpId: string }) {
  const [reminders, setReminders] = useState<ReminderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load(): Promise<void> {
      try {
        const res = await fetch(`/api/v1/dumps/${dumpId}/reminder`, { cache: 'no-store' })
        const json = (await res.json().catch(() => null)) as {
          data?: ReminderSummary[] | ReminderSummary | null
        } | null
        if (cancelled) return
        // Tolerate the pre-1.3 single-object shape from a stale cache/SW.
        const data = json?.data
        setReminders(Array.isArray(data) ? data : data ? [data] : [])
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

  async function cancel(id: string): Promise<void> {
    const previous = reminders
    setCancellingId(id)
    setError(null)
    setReminders((prev) => prev.filter((r) => r.id !== id))
    try {
      const res = await fetch(`/api/v1/dumps/${dumpId}/reminder?reminderId=${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Request failed')
    } catch {
      setReminders(previous)
      setError('We could not cancel that reminder. Try again.')
    } finally {
      setCancellingId(null)
    }
  }

  if (loading) return null

  const pending = reminders.filter((r) => r.status === 'pending')

  return (
    <div data-no-print className="flex flex-col gap-2">
      {pending.map((reminder) => (
        <div
          key={reminder.id}
          className="rounded-btn border-flame/25 bg-flame/[0.08] flex min-h-12 flex-wrap items-center justify-between gap-2 border px-4 py-2"
        >
          <div className="flex min-w-0 items-center gap-2.5 text-[15px]">
            <BellIcon size={18} className="text-flame shrink-0" />
            <span>
              <span className="text-flame font-medium">Reminder</span> ·{' '}
              {formatDayLabel(reminder.remind_at)}, {formatTime(reminder.remind_at)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void cancel(reminder.id)}
            disabled={cancellingId === reminder.id}
            className="text-muted hover:text-ink min-h-11 shrink-0 px-2 text-xs underline underline-offset-4 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      ))}

      {pending.length < MAX_REMINDERS ? (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="rounded-btn border-ink/10 text-muted hover:text-ink hover:bg-ink/[0.03] flex min-h-12 items-center justify-center gap-2 border border-dashed px-4 text-[15px] transition-colors"
        >
          <PlusIcon size={16} />
          {pending.length === 0 ? 'Set a reminder' : 'Add another reminder'}
        </button>
      ) : null}

      {error ? (
        <p role="alert" className="text-muted text-sm">
          {error}
        </p>
      ) : null}

      <ReminderPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onCreated={(r) => {
          setReminders((prev) =>
            [...prev, r].sort(
              (a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime(),
            ),
          )
          setPickerOpen(false)
        }}
        dumpId={dumpId}
      />
    </div>
  )
}

const TIME_PRESETS = [
  { label: 'Morning', hour: 9, minute: 0 },
  { label: 'Noon', hour: 12, minute: 0 },
  { label: 'Evening', hour: 18, minute: 0 },
  { label: 'Night', hour: 21, minute: 0 },
] as const

/** The next 7 days as picker options, starting today. */
function dayOptions(): { label: string; date: Date }[] {
  const days: { label: string; date: Date }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    d.setHours(0, 0, 0, 0)
    const label =
      i === 0
        ? 'Today'
        : i === 1
          ? 'Tomorrow'
          : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
    days.push({ label, date: d })
  }
  return days
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

/**
 * Custom day + time picker: a week of day chips, quick time-of-day presets,
 * and hour/minute steppers around a large readout — no native datetime UI.
 */
function ReminderPicker({
  open,
  onClose,
  onCreated,
  dumpId,
}: {
  open: boolean
  onClose: () => void
  onCreated: (r: ReminderSummary) => void
  dumpId: string
}) {
  const [dayIndex, setDayIndex] = useState(0)
  const [hour, setHour] = useState(18)
  const [minute, setMinute] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Recompute "today…" only when the picker opens, so day chips are current.
  const days = useMemo(() => (open ? dayOptions() : []), [open])

  useEffect(() => {
    if (!open) return
    // Fresh defaults each open: tomorrow evening is the most common intent.
    setDayIndex(1)
    setHour(18)
    setMinute(0)
    setError(null)
  }, [open])

  if (!open || days.length === 0) {
    return <CenterDialog open={false} title="Set a reminder" onClose={onClose}>{null}</CenterDialog>
  }

  const chosen = new Date(days[dayIndex]!.date)
  chosen.setHours(hour, minute, 0, 0)
  const inPast = chosen.getTime() < Date.now() + 60_000

  function step(unit: 'hour' | 'minute', delta: number): void {
    if (unit === 'hour') setHour((h) => (h + delta + 24) % 24)
    else setMinute((m) => (m + delta + 60) % 60)
  }

  async function save(): Promise<void> {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/dumps/${dumpId}/reminder`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ remind_at: chosen.toISOString() }),
      })
      const json = (await res.json().catch(() => null)) as {
        data?: ReminderSummary
        error?: { message?: string }
      } | null
      if (!res.ok || !json?.data) {
        throw new Error(json?.error?.message ?? 'Failed')
      }
      onCreated(json.data)
    } catch (e) {
      setError(e instanceof Error && e.message !== 'Failed' ? e.message : 'We could not set that reminder. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CenterDialog open={open} title="Set a reminder" onClose={onClose}>
      <div className="flex flex-col gap-5">
        {/* Day */}
        <div className="flex flex-col gap-2">
          <span className="text-muted text-xs tracking-wide uppercase">Day</span>
          <div className="flex flex-wrap gap-1.5">
            {days.map((d, i) => (
              <button
                key={d.label}
                type="button"
                onClick={() => setDayIndex(i)}
                aria-pressed={dayIndex === i}
                className={cn(
                  'min-h-9 rounded-full px-3 text-sm transition-colors',
                  dayIndex === i ? 'bg-flame text-white' : 'bg-ink/5 text-ink hover:bg-ink/10',
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time */}
        <div className="flex flex-col gap-2">
          <span className="text-muted text-xs tracking-wide uppercase">Time</span>
          <div className="flex flex-wrap gap-1.5">
            {TIME_PRESETS.map((p) => {
              const active = hour === p.hour && minute === p.minute
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setHour(p.hour)
                    setMinute(p.minute)
                  }}
                  aria-pressed={active}
                  className={cn(
                    'min-h-9 rounded-full px-3 text-sm transition-colors',
                    active ? 'bg-flame text-white' : 'bg-ink/5 text-ink hover:bg-ink/10',
                  )}
                >
                  {p.label} {pad(p.hour)}:{pad(p.minute)}
                </button>
              )
            })}
          </div>

          {/* Steppers around a large readout */}
          <div className="mt-1 flex items-center justify-center gap-4">
            <TimeStepper onUp={() => step('hour', 1)} onDown={() => step('hour', -1)}>
              {pad(hour)}
            </TimeStepper>
            <span className="text-2xl font-semibold">:</span>
            <TimeStepper onUp={() => step('minute', 5)} onDown={() => step('minute', -5)}>
              {pad(minute)}
            </TimeStepper>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={() => void save()} loading={saving} disabled={inPast} fullWidth>
            {inPast
              ? 'Pick a time in the future'
              : `Remind me ${days[dayIndex]!.label === 'Today' || days[dayIndex]!.label === 'Tomorrow' ? days[dayIndex]!.label.toLowerCase() : days[dayIndex]!.label} at ${pad(hour)}:${pad(minute)}`}
          </Button>
          {error ? (
            <p role="alert" className="text-muted text-center text-sm">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </CenterDialog>
  )
}

/** Vertical − / value / + control for one time unit. */
function TimeStepper({
  children,
  onUp,
  onDown,
}: {
  children: React.ReactNode
  onUp: () => void
  onDown: () => void
}) {
  const btn =
    'flex h-10 w-14 items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-ink/5 transition-colors text-lg'
  return (
    <div className="border-ink/10 flex flex-col items-center rounded-xl border">
      <button type="button" onClick={onUp} aria-label="Increase" className={btn}>
        +
      </button>
      <span className="w-14 text-center text-3xl font-semibold tabular-nums">{children}</span>
      <button type="button" onClick={onDown} aria-label="Decrease" className={btn}>
        −
      </button>
    </div>
  )
}
