'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEngagementNudge } from '@/hooks/useEngagementNudge'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { InstallSheet, type InstallableDevice } from './InstallPrompt'
import { XIcon } from './icons'

/**
 * The single recurring engagement nudge (see {@link useEngagementNudge}) — one
 * gentle reminder per week to install the app or, once installed, turn on
 * notifications. Renders a small bottom toast; the install path either fires
 * the native prompt or opens a device-specific walkthrough.
 */
export function EngagementNudge() {
  const { kind, snooze } = useEngagementNudge()
  const { device, canPromptNatively, promptInstall } = useInstallPrompt()
  const { busy, enable } = usePushNotifications()
  const [sheetOpen, setSheetOpen] = useState(false)

  async function handleInstall(): Promise<void> {
    if (canPromptNatively) {
      const outcome = await promptInstall()
      if (outcome !== 'unavailable') snooze()
      return
    }
    setSheetOpen(true)
  }

  async function handleEnable(): Promise<void> {
    await enable()
    snooze()
  }

  const copy =
    kind === 'install'
      ? {
          title: `Install Dumpty on your ${device === 'ios' ? 'iPhone' : 'device'}`,
          sub: 'Quick access, offline recording, no app store.',
          cta: 'Install',
          onCta: handleInstall,
        }
      : {
          title: 'Turn on notifications',
          sub: 'Get nudges and news about new features.',
          cta: busy ? 'Enabling…' : 'Enable',
          onCta: handleEnable,
        }

  return (
    <>
      <AnimatePresence>
        {kind && !sheetOpen ? (
          <motion.div
            key="engagement-toast"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm"
          >
            <div className="flex items-center gap-2 p-3">
              <div className="min-w-0 flex-1 py-1">
                <p className="text-[15px]">{copy.title}</p>
                <p className="text-muted text-xs">{copy.sub}</p>
              </div>
              <button
                type="button"
                onClick={() => void copy.onCta()}
                disabled={busy}
                className="rounded-btn bg-flame min-h-11 shrink-0 px-4 text-sm text-white disabled:opacity-50"
              >
                {copy.cta}
              </button>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={snooze}
                className="text-muted -m-2 shrink-0 p-2"
              >
                <XIcon size={16} />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {sheetOpen ? (
          <InstallSheet
            device={device as InstallableDevice}
            onClose={() => {
              setSheetOpen(false)
              snooze()
            }}
          />
        ) : null}
      </AnimatePresence>
    </>
  )
}
