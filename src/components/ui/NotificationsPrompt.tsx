'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { XIcon } from './icons'

const DISMISSED_KEY = 'dumpty_push_prompt_dismissed'
const SHOW_DELAY_MS = 6000

/** True when the app is running as an installed PWA (standalone display mode). */
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari exposes this non-standard flag on navigator.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

/**
 * Nudges the user to enable push notifications, once, a few seconds after they
 * open the installed app. Only shown when push is actually usable here
 * (supported, permission still 'default', not already subscribed) and the app
 * is installed — on iOS push only works from the Home-Screen PWA, and gating on
 * standalone also keeps this from colliding with the install prompt.
 */
export function NotificationsPrompt() {
  const { supported, permission, subscribed, busy, enable } = usePushNotifications()
  const [dismissed, setDismissed] = useState(true) // default true until checked, avoids a flash
  const [standalone, setStandalone] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === '1')
    setStandalone(isStandalone())
  }, [])

  const eligible = supported && standalone && permission === 'default' && !subscribed && !dismissed

  useEffect(() => {
    if (!eligible) return
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [eligible])

  function dismiss(): void {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
    setVisible(false)
  }

  async function handleEnable(): Promise<void> {
    await enable()
    // Whatever the outcome (granted, denied, or dismissed at the OS prompt),
    // don't nag again — the account screen still offers a manual toggle.
    dismiss()
  }

  if (!eligible) return null

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="push-toast"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm"
        >
          <div className="rounded-card border-ink/10 bg-canvas flex items-center gap-2 border p-3 shadow-lg">
            <div className="min-w-0 flex-1 py-1">
              <p className="text-[15px]">Turn on notifications</p>
              <p className="text-muted text-xs">Get nudges and news about new features.</p>
            </div>
            <button
              type="button"
              onClick={() => void handleEnable()}
              disabled={busy}
              className="rounded-btn bg-flame min-h-11 shrink-0 px-4 text-sm text-white disabled:opacity-50"
            >
              {busy ? 'Enabling…' : 'Enable'}
            </button>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={dismiss}
              className="text-muted -m-2 shrink-0 p-2"
            >
              <XIcon size={16} />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
