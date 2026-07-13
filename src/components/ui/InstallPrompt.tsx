'use client'

import { motion } from 'framer-motion'
import type { DeviceKind } from '@/hooks/useInstallPrompt'
import { Button } from './Button'

export type InstallableDevice = Exclude<DeviceKind, 'other'>

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
 * Device-specific manual install walkthrough, shown when the browser can't
 * trigger a native install prompt (iOS Safari always; Chromium before it has
 * offered its prompt). Centered modal — scheduling is owned by the caller.
 */
export function InstallSheet({
  device,
  onClose,
}: {
  device: InstallableDevice
  onClose: () => void
}) {
  const steps = INSTRUCTIONS[device]
  return (
    <motion.div
      key="install-sheet-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="rounded-card bg-canvas w-full max-w-sm p-6"
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
        <div className="mt-6">
          <Button onClick={onClose} fullWidth>
            Got it
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
