'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useUpdatePrompt } from '@/hooks/useUpdatePrompt'
import { XIcon } from './icons'
import { REFRESH_FLAG } from './PullToRefresh'

/**
 * Small, dismissible notice that a newer version of the app is live. Slides in
 * from the top so it never covers the primary content or the tab bar. Tapping
 * "Update" reloads (the splash flag keeps the Dumpty logo up across the reload).
 * Detection is disabled in local dev, so this only appears in production.
 */
export function UpdatePrompt() {
  const updateAvailable = useUpdatePrompt()
  const [dismissed, setDismissed] = useState(false)
  const show = updateAvailable && !dismissed

  function update(): void {
    try {
      sessionStorage.setItem(REFRESH_FLAG, '1')
    } catch {
      /* private mode — non-fatal */
    }
    window.location.reload()
  }

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="fixed inset-x-0 top-0 z-[70] flex justify-center px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)]"
        >
          <div className="rounded-card border-ink/10 bg-canvas flex w-full max-w-md items-center gap-3 border px-4 py-2.5 shadow-sm">
            <span className="flex-1 text-[13px]">A new version of Dumpty is ready.</span>
            <button
              type="button"
              onClick={update}
              className="rounded-btn bg-flame flex h-8 items-center px-3 text-[13px] text-white"
            >
              Update
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss"
              className="text-muted hover:text-ink -mr-1 flex h-8 w-8 items-center justify-center"
            >
              <XIcon size={16} />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
