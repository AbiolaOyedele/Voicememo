'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useInstallPrompt, type DeviceKind } from '@/hooks/useInstallPrompt'
import { Button } from './Button'
import { XIcon } from './icons'

const DISMISSED_KEY = 'dumpty_install_prompt_dismissed'
const SHOW_DELAY_MS = 4000

type InstallableDevice = Exclude<DeviceKind, 'other'>

const INSTRUCTIONS: Record<InstallableDevice, { subtitle: string; items: string[] }> = {
  ios: {
    subtitle: "Add Dumpty to your Home Screen in Safari:",
    items: [
      "Tap the Share icon in Safari's toolbar (the square with an arrow pointing up).",
      'Scroll down and tap "Add to Home Screen."',
      'Tap "Add" in the top right.',
    ],
  },
  android: {
    subtitle: 'Add Dumpty to your Home Screen in Chrome:',
    items: [
      'Tap the menu icon (⋮) in the top right of Chrome.',
      'Tap "Add to Home screen" or "Install app."',
      'Tap "Install" to confirm.',
    ],
  },
  desktop: {
    subtitle: 'Install Dumpty as an app on your computer:',
    items: [
      "Look for the install icon in your browser's address bar (a small monitor with an arrow).",
      'Click it, then click "Install."',
      'If you don\'t see it, open the browser menu and look for "Install Dumpty."',
    ],
  },
}

/**
 * Prompts the user to install the PWA, once, a few seconds after they land.
 * On Chromium browsers that support it, tapping "Install" triggers the native
 * one-tap dialog directly. iOS Safari has no such API, so it (and any
 * Chromium browser that hasn't offered the native prompt) falls back to a
 * short, device-specific manual walkthrough.
 */
export function InstallPrompt() {
  const { device, installed, canPromptNatively, promptInstall } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(true) // default true until checked, avoids a flash
  const [visible, setVisible] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === '1')
  }, [])

  useEffect(() => {
    if (installed || dismissed || device === 'other') return
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [installed, dismissed, device])

  function dismiss(): void {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
    setVisible(false)
    setSheetOpen(false)
  }

  async function handleTap(): Promise<void> {
    if (canPromptNatively) {
      const outcome = await promptInstall()
      if (outcome !== 'unavailable') dismiss()
      return
    }
    setSheetOpen(true)
  }

  if (installed || dismissed || device === 'other') return null

  return (
    <>
      <AnimatePresence>
        {visible && !sheetOpen ? (
          <motion.div
            key="install-toast"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm"
          >
            <div className="rounded-card border-ink/10 bg-canvas flex items-center gap-2 border p-3 shadow-lg">
              <button
                type="button"
                onClick={() => void handleTap()}
                className="min-w-0 flex-1 py-1 text-left"
              >
                <p className="text-[15px]">
                  Install Dumpty on your {device === 'ios' ? 'iPhone' : 'device'}
                </p>
                <p className="text-muted text-xs">Quick access, offline recording, no app store.</p>
              </button>
              <button
                type="button"
                onClick={() => void handleTap()}
                className="rounded-btn bg-flame min-h-11 shrink-0 px-4 text-sm text-white"
              >
                Install
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

      <AnimatePresence>
        {sheetOpen ? (
          <InstallSheet device={device} onClose={() => setSheetOpen(false)} onDismissForever={dismiss} />
        ) : null}
      </AnimatePresence>
    </>
  )
}

function InstallSheet({
  device,
  onClose,
  onDismissForever,
}: {
  device: InstallableDevice
  onClose: () => void
  onDismissForever: () => void
}) {
  const steps = INSTRUCTIONS[device]
  return (
    <motion.div
      key="install-sheet-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/30 sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="rounded-t-card bg-canvas w-full max-w-sm p-6 sm:rounded-card"
      >
        <h2 className="text-lg">Install Dumpty</h2>
        <p className="text-muted mt-1 text-sm">{steps.subtitle}</p>
        <ol className="mt-4 flex flex-col gap-3">
          {steps.items.map((item, i) => (
            <li key={item} className="flex gap-3 text-[15px]">
              <span className="bg-ink/5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs">
                {i + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={onClose} fullWidth>
            Got it
          </Button>
          <button
            type="button"
            onClick={onDismissForever}
            className="text-muted min-h-11 text-center text-xs underline underline-offset-4"
          >
            Don&apos;t show this again
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
