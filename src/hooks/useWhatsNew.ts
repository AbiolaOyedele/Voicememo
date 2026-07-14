'use client'

import { useEffect, useState } from 'react'
import changelogData from '@/data/changelog.json'
import type { ChangelogEntry } from '@/types/changelog'

const SEEN_KEY = 'dumpty_whats_new_seen'
// Appears just after the brand splash (z-100, ~1.9s) has faded, so the toast is
// never masked behind it and its full visible window is actually seen.
const SHOW_DELAY_MS = 2200
const AUTO_DISMISS_MS = 6000

const entries = changelogData as ChangelogEntry[]

export interface WhatsNew {
  visible: boolean
  highlight: string | null
  dismiss: () => void
}

/**
 * Surfaces the latest changelog entry's `highlight` line once — the first
 * time a visitor opens the app after it ships — then never again. Entries
 * without a `highlight` (routine bug-fix releases) are silently skipped, so
 * this only interrupts for changes actually worth telling someone about.
 */
export function useWhatsNew(): WhatsNew {
  const [visible, setVisible] = useState(false)
  const latest = entries[0]

  useEffect(() => {
    if (!latest?.highlight) return
    if (localStorage.getItem(SEEN_KEY) === latest.version) return
    const showTimer = setTimeout(() => {
      setVisible(true)
      // Marked seen the moment it's shown, not on dismiss — so it's a true
      // one-shot even if the visitor navigates away before the auto-dismiss.
      localStorage.setItem(SEEN_KEY, latest.version)
    }, SHOW_DELAY_MS)
    return () => clearTimeout(showTimer)
  }, [latest])

  useEffect(() => {
    if (!visible) return
    const hideTimer = setTimeout(() => setVisible(false), AUTO_DISMISS_MS)
    return () => clearTimeout(hideTimer)
  }, [visible])

  return {
    visible,
    highlight: latest?.highlight ?? null,
    dismiss: () => setVisible(false),
  }
}
