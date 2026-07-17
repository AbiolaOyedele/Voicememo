'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { UserMessage } from '@/types/messages'
import { XIcon } from '@/components/ui/icons'

/**
 * In-app messages from the Dumpty team (feedback replies, announcements),
 * shown at the top of the Account tab until dismissed. Renders nothing while
 * loading or when the inbox is empty, so the tab never jumps for most users.
 */
export function MessagesSection() {
  const [messages, setMessages] = useState<UserMessage[]>([])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/v1/messages', { cache: 'no-store' })
        if (!res.ok) return
        const json = (await res.json().catch(() => null)) as { data?: UserMessage[] } | null
        if (!cancelled && json?.data) setMessages(json.data)
      } catch {
        // Quiet failure — the inbox just doesn't render this visit.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function dismiss(id: string): void {
    // Optimistic removal; a failed dismissal simply resurfaces next visit.
    setMessages((prev) => prev.filter((m) => m.id !== id))
    void fetch(`/api/v1/messages/${id}`, { method: 'DELETE' }).catch(() => {})
  }

  if (messages.length === 0) return null

  return (
    <section className="flex flex-col gap-2" aria-label="Messages from the Dumpty team">
      <h2 className="text-muted px-1 text-xs tracking-wide uppercase">From the team</h2>
      <AnimatePresence initial={false}>
        {messages.map((m) => (
          <motion.article
            key={m.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-card border-flame/25 bg-flame/[0.04] flex items-start gap-3 border p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[15px]">{m.title}</p>
              <p className="text-muted mt-1 text-sm whitespace-pre-wrap">{m.body}</p>
              <p className="text-muted mt-2 text-xs">
                {new Date(m.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(m.id)}
              aria-label="Dismiss message"
              className="text-muted hover:text-ink -m-2 shrink-0 p-3 transition-colors"
            >
              <XIcon size={16} />
            </button>
          </motion.article>
        ))}
      </AnimatePresence>
    </section>
  )
}
