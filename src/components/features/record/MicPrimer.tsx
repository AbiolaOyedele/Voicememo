'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { MicIcon } from '@/components/ui/icons'

interface MicPrimerProps {
  open: boolean
  onAllow: () => void
  onClose: () => void
}

/**
 * Our own on-brand explainer shown once, right before the browser's native
 * microphone permission dialog. The native grant prompt itself can't be
 * restyled or replaced (the browser owns it for security), so this primes the
 * user for it: tapping "Allow microphone" closes this and triggers the real
 * system prompt, which then feels intentional instead of abrupt.
 */
export function MicPrimer({ open, onAllow, onClose }: MicPrimerProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="mic-primer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="rounded-card bg-canvas w-full max-w-sm p-6 text-center"
          >
            <div className="bg-flame/12 text-flame mx-auto flex h-14 w-14 items-center justify-center rounded-full">
              <MicIcon size={26} />
            </div>
            <h2 className="mt-4 text-lg">Let Dumpty hear you</h2>
            <p className="text-muted mt-1.5 text-sm">
              Dumpty needs your microphone to capture ideas as you speak. Your browser will ask you
              to allow it next — tap Allow to start recording.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button onClick={onAllow} fullWidth>
                Allow microphone
              </Button>
              <button
                type="button"
                onClick={onClose}
                className="text-muted hover:text-ink min-h-11 text-center text-sm"
              >
                Not now
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
