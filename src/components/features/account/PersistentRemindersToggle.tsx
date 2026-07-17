'use client'

import { useEffect, useState } from 'react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { CenterDialog } from '@/components/ui/CenterDialog'
import { Button } from '@/components/ui/Button'

/**
 * Settings row for persistent reminders: when on, a due reminder rings ~10
 * times in quick succession (one notification re-alerting each second)
 * instead of a single ping. Off by default.
 *
 * Turning it on first makes sure notifications work — if this device isn't
 * subscribed yet, the normal permission flow runs; if it is, we skip straight
 * to saving. Either way an explainer popup confirms what was just enabled.
 * Hides itself where push isn't supported, like the Notifications row.
 */
export function PersistentRemindersToggle() {
  const { supported, permission, subscribed, enable } = usePushNotifications()
  const [enabled, setEnabled] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/v1/account/preferences', { cache: 'no-store' })
        const json = (await res.json().catch(() => null)) as {
          data?: { persistentReminders?: boolean }
        } | null
        if (!cancelled && json?.data) setEnabled(Boolean(json.data.persistentReminders))
      } catch {
        // Quiet failure — the row still renders with the default (off).
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function savePref(next: boolean): Promise<boolean> {
    const res = await fetch('/api/v1/account/preferences', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ persistent_reminders: next }),
    }).catch(() => null)
    return Boolean(res?.ok)
  }

  async function turnOn(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      // Persistent reminders are pointless without notifications — run the
      // permission/subscribe flow first when this device isn't set up yet.
      if (!subscribed) {
        await enable()
        const granted =
          typeof Notification !== 'undefined' && Notification.permission === 'granted'
        if (!granted) {
          setError('Turn on notifications first — the prompt was dismissed or blocked.')
          return
        }
      }
      if (!(await savePref(true))) {
        setError('We could not save that setting. Try again.')
        return
      }
      setEnabled(true)
      setNoteOpen(true)
    } finally {
      setBusy(false)
    }
  }

  async function turnOff(): Promise<void> {
    setBusy(true)
    setError(null)
    const ok = await savePref(false)
    if (ok) setEnabled(false)
    else setError('We could not save that setting. Try again.')
    setBusy(false)
  }

  if (!supported) return null
  const blocked = permission === 'denied'

  return (
    <>
      <li className="flex items-center justify-between gap-3 px-4 py-3.5">
        <div className="min-w-0">
          <span className="text-[15px]">Persistent reminders</span>
          {error ? (
            <p className="text-muted text-xs">{error}</p>
          ) : (
            <p className="text-muted text-xs">
              Reminders ring about 10 times so you can&apos;t miss them.
            </p>
          )}
        </div>
        {!loaded ? (
          <span className="text-muted shrink-0 text-xs">…</span>
        ) : enabled ? (
          <button
            type="button"
            onClick={() => void turnOff()}
            disabled={busy}
            className="text-muted hover:text-ink min-h-11 shrink-0 text-sm disabled:opacity-50"
          >
            {busy ? '…' : 'Turn off'}
          </button>
        ) : blocked ? (
          <span className="text-muted shrink-0 text-xs">Needs notifications</span>
        ) : (
          <button
            type="button"
            onClick={() => void turnOn()}
            disabled={busy}
            className="rounded-btn bg-flame min-h-9 shrink-0 px-3 text-sm text-white disabled:opacity-50"
          >
            {busy ? 'Enabling…' : 'Enable'}
          </button>
        )}
      </li>

      <CenterDialog
        open={noteOpen}
        title="Persistent reminders are on"
        onClose={() => setNoteOpen(false)}
      >
        <div className="flex flex-col gap-4">
          <p className="text-[15px] leading-relaxed">
            When a reminder is due, Dumpty will ring about <strong>10 times</strong> — once a
            second — until you notice. It&apos;s one notification that keeps re-alerting, not ten
            piling up.
          </p>
          <p className="text-muted text-sm leading-relaxed">
            This applies to every reminder on this account. You can switch back to a single
            gentle ping anytime by turning this off.
          </p>
          <Button onClick={() => setNoteOpen(false)} fullWidth>
            Got it
          </Button>
        </div>
      </CenterDialog>
    </>
  )
}
