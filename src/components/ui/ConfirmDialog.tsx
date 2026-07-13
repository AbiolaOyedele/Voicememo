'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * In-app confirmation modal for destructive actions. Replaces
 * `window.confirm()`, which is unreliable inside an installed PWA's
 * standalone mode on iOS (native dialogs can silently fail to appear there).
 * The confirm button uses the flame accent (Button's primary variant) so it
 * reads unmistakably as the "do the destructive thing" action.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Portal to body so the swipe track's CSS transform doesn't reparent this
  // fixed-position modal and push it off-screen.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="confirm-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/30 p-4 sm:items-center"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="rounded-card bg-canvas w-full max-w-sm p-6"
          >
            <h2 className="text-lg">{title}</h2>
            <div className="text-muted mt-1.5 text-sm">{description}</div>
            <div className="mt-6 flex flex-col gap-2">
              <Button variant="primary" fullWidth loading={loading} onClick={onConfirm}>
                {confirmLabel}
              </Button>
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="text-muted hover:text-ink min-h-11 text-center text-sm disabled:opacity-60"
              >
                {cancelLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
