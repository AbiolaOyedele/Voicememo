'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { XIcon } from './icons'

interface CenterDialogProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * Centered content modal — a backdrop with a card that springs up from slightly
 * below (bottom-sheet on narrow screens, centered on wider ones). For read-only
 * content like the changelog and the coming-soon list, not confirmations
 * (that's {@link ConfirmDialog}). Locks body scroll and closes on Escape.
 *
 * Rendered through a portal to `document.body` so it escapes the swipe track's
 * CSS transform — a transformed ancestor becomes the containing block for
 * `position: fixed`, which would otherwise offset the dialog off-screen.
 */
export function CenterDialog({ open, title, onClose, children }: CenterDialogProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="center-dialog-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/30 p-4 sm:items-center"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="rounded-card bg-canvas flex max-h-[80dvh] w-full max-w-sm flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
              <h2 className="text-lg tracking-tight">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-muted hover:text-ink -mr-1.5 flex h-9 w-9 items-center justify-center rounded-full"
              >
                <XIcon size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
