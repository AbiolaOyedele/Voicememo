'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Chip } from '@/components/ui/Chip'
import { Button } from '@/components/ui/Button'

type FeedbackType = 'bug' | 'feature' | 'other'

const TYPE_OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'other', label: 'Other' },
]

/** Same feedback inbox used across the theruff.agency projects (see Fey). */
const FEEDBACK_EMAIL = 'hello@theruff.agency'

/**
 * Give-feedback row + dialog. Opens the user's own email client with a
 * pre-filled message rather than calling a backend — this project has no
 * Resend/email sending wired up yet, so a mailto: link is the
 * zero-infrastructure version that works today. Same destination address
 * Fey uses for its feedback inbox.
 */
export function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>('feature')
  const [message, setMessage] = useState('')

  function send(): void {
    const subject = encodeURIComponent(`Dumpty feedback — ${type}`)
    const body = encodeURIComponent(message.trim())
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`
    setOpen(false)
    setMessage('')
    setType('feature')
  }

  return (
    <>
      <li>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-11 w-full items-center justify-between px-4 py-3.5 text-left"
        >
          <span className="text-[15px]">Give feedback</span>
          <span className="text-muted text-xs">Bug, idea, anything</span>
        </button>
      </li>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="feedback-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/30 p-4 sm:items-center"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-card bg-canvas w-full max-w-sm p-6"
            >
              <h2 className="text-lg">Give feedback</h2>
              <p className="text-muted mt-1 text-sm">
                Opens your email app with this filled in — we read every one.
              </p>

              <div className="mt-4 flex gap-1.5">
                {TYPE_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    active={type === opt.value}
                    onClick={() => setType(opt.value)}
                  >
                    {opt.label}
                  </Chip>
                ))}
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's on your mind?"
                rows={4}
                className="rounded-btn border-ink/15 placeholder:text-muted focus:border-ink mt-3 w-full resize-none border bg-transparent p-3 text-[15px] outline-none"
              />

              <div className="mt-4 flex flex-col gap-2">
                <Button onClick={send} disabled={message.trim().length < 3} fullWidth>
                  Send
                </Button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-muted hover:text-ink min-h-11 text-center text-sm"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
