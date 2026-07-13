'use client'

import { useEffect, useState } from 'react'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { usePushNotifications } from '@/hooks/usePushNotifications'

const LAST_SHOWN_KEY = 'dumpty_nudge_last_shown'
const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const SHOW_DELAY_MS = 5000

export type NudgeKind = 'install' | 'notifications'

export interface EngagementNudge {
  /** Which nudge to show right now, or null for none. */
  kind: NudgeKind | null
  /** Record that a nudge was shown/handled so it won't reappear for a week. */
  snooze: () => void
}

/**
 * Decides whether to nudge the user — at most once every 7 days — to enable
 * notifications or install the app. Whoever has already done both is never
 * nudged. This replaces the old one-time install/notification prompts with a
 * single, gentle, recurring reminder for the thing they're missing.
 */
export function useEngagementNudge(): EngagementNudge {
  const { device, installed } = useInstallPrompt()
  const { supported, permission, subscribed } = usePushNotifications()
  const [ready, setReady] = useState(false)
  const [dueThisWeek, setDueThisWeek] = useState(false)
  const [visible, setVisible] = useState(false)

  // Decide, once on mount, whether we're inside the weekly quiet period.
  useEffect(() => {
    const raw = localStorage.getItem(LAST_SHOWN_KEY)
    const last = raw ? Number(raw) : 0
    setDueThisWeek(!last || Date.now() - last >= WEEK_MS)
    setReady(true)
  }, [])

  // What's the user missing? Notifications take priority whenever push already
  // works in-browser (desktop and Android Chrome don't require installing the
  // PWA first) — only iOS needs the install step before push becomes available
  // at all, which `supported` naturally reflects. A 'denied' notification
  // permission counts as "nothing we can do", so we don't nag about it.
  let kind: NudgeKind | null = null
  if (supported && permission === 'default' && !subscribed) {
    kind = 'notifications'
  } else if (!installed && device !== 'other') {
    kind = 'install'
  }

  useEffect(() => {
    if (!ready || !dueThisWeek || !kind) return
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [ready, dueThisWeek, kind])

  function snooze(): void {
    localStorage.setItem(LAST_SHOWN_KEY, String(Date.now()))
    setDueThisWeek(false)
    setVisible(false)
  }

  return { kind: visible ? kind : null, snooze }
}
