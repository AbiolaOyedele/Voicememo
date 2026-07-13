'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Chip } from '@/components/ui/Chip'
import { Button } from '@/components/ui/Button'
import changelogData from '@/data/changelog.json'

type FeedbackType = 'bug' | 'feature' | 'other'
type Status = 'idle' | 'sending' | 'sent' | 'error'

const TYPE_OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'other', label: 'Other' },
]

/** Current app version, tagged onto each submission so we know the build. */
const APP_VERSION = (changelogData as { version?: string }[])[0]?.version ?? null

/**
 * Give-feedback row + dialog. Sends the message straight to our feedback inbox
 * (POST /api/v1/feedback → emailed to us via Resend) — no email app, no redirect.
 * Works for guests and signed-in users alike. Shows an in-app confirmation on
 * success and a plain-English retry on failure.
 */
export function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>('feature')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  function close(): void {
    setOpen(false)
    // Reset after the exit animation so the dialog doesn't flip content mid-close.
    window.setTimeout(() => {
      setMessage('')
      setType('feature')
      setStatus('idle')
    }, 220)
  }

  async function send(): Promise<void> {
    if (message.trim().length < 3) return
    setStatus('sending')
    try {
      const res = await fetch('/api/v1/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type,
          message: message.trim(),
          page_url: window.location.pathname,
          app_version: APP_VERSION,
        }),
      })
      if (!res.ok) throw new Error('failed')
      setStatus('sent')
    } catch {
      setStatus('error')
    }
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
            onClick={close}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-card bg-canvas w-full max-w-sm p-6"
            >
              {status === 'sent' ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <h2 className="text-lg">Thank you</h2>
                  <p className="text-muted text-sm">
                    Got it — every note is read. We appreciate you taking the time.
                  </p>
                  <Button onClick={close} fullWidth>
                    Done
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="text-lg">Give feedback</h2>
                  <p className="text-muted mt-1 text-sm">
                    Tell us what&apos;s working, what isn&apos;t, or what you&apos;d love to see.
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

                  {status === 'error' ? (
                    <p role="alert" className="text-muted mt-2 text-sm">
                      That didn&apos;t send. Check your connection and try again.
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-col gap-2">
                    <Button
                      onClick={() => void send()}
                      loading={status === 'sending'}
                      disabled={message.trim().length < 3}
                      fullWidth
                    >
                      {status === 'error' ? 'Try again' : 'Send'}
                    </Button>
                    <button
                      type="button"
                      onClick={close}
                      className="text-muted hover:text-ink min-h-11 text-center text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
