'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useWhatsNew } from '@/hooks/useWhatsNew'

/**
 * A small, non-intrusive line of text at the top announcing the latest
 * changelog highlight — no card or background, just text (same restraint as
 * {@link UpdatePrompt}). Shows once, on a visitor's first app open after it
 * ships (see {@link useWhatsNew}), then auto-dismisses and never reappears.
 * Tap to dismiss early.
 */
export function WhatsNewPrompt() {
  const { visible, highlight, dismiss } = useWhatsNew()

  return (
    <AnimatePresence>
      {visible && highlight ? (
        <motion.button
          type="button"
          onClick={dismiss}
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -24, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-6 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[70] mx-auto flex max-w-xs flex-col items-center justify-center gap-0.5 text-center"
        >
          <span className="text-flame text-[11px] font-medium tracking-wide">What&apos;s new</span>
          <span className="text-muted text-[11px] leading-snug">{highlight}</span>
        </motion.button>
      ) : null}
    </AnimatePresence>
  )
}
