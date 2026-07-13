'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useUpdatePrompt } from '@/hooks/useUpdatePrompt'
import { ChevronDownIcon } from './icons'

/**
 * A tiny, non-intrusive hint at the very top telling the user a newer version
 * is live and to pull down to get it — the pull-to-refresh gesture reloads and
 * picks up the new deploy. Not a bar or a button: just a small line of text
 * that clears itself once the app is refreshed (the new build no longer differs,
 * so the hint stops showing). Detection is prod-only, so it never shows in dev.
 */
export function UpdatePrompt() {
  const updateAvailable = useUpdatePrompt()

  return (
    <AnimatePresence>
      {updateAvailable ? (
        <motion.div
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -24, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center pt-[calc(env(safe-area-inset-top)+0.5rem)]"
        >
          <span className="text-muted bg-canvas/80 flex items-center gap-1 rounded-full px-3 py-1 text-[11px] tracking-wide backdrop-blur-sm">
            New version — pull down to update
            <motion.span
              animate={{ y: [0, 2, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ChevronDownIcon size={12} />
            </motion.span>
          </span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
