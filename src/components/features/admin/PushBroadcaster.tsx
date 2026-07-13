'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { BroadcastResult } from '@/services/push.service'

type Status = 'idle' | 'sending' | 'sent' | 'error'

/**
 * Admin composer that broadcasts a web-push notification to every subscriber.
 * Posts to /api/v1/admin/push (admin-gated server-side). Shows a delivery
 * summary on success and a plain-English retry on failure.
 */
export function PushBroadcaster({ subscriberCount }: { subscriberCount: number }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<BroadcastResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const canSend = title.trim().length > 0 && body.trim().length > 0 && status !== 'sending'

  async function send(): Promise<void> {
    if (!canSend) return
    setStatus('sending')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/v1/admin/push', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          url: url.trim() || undefined,
        }),
      })
      const json = (await res.json().catch(() => null)) as
        | { data?: BroadcastResult; error?: { message?: string } }
        | null
      if (!res.ok || !json?.data) {
        throw new Error(json?.error?.message ?? 'Send failed')
      }
      setResult(json.data)
      setStatus('sent')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Send failed')
      setStatus('error')
    }
  }

  return (
    <div className="rounded-card border-ink/10 border p-4">
      <p className="text-muted text-sm">
        Reaches <span className="text-ink font-medium">{subscriberCount.toLocaleString()}</span>{' '}
        subscribed {subscriberCount === 1 ? 'device' : 'devices'}. Only users who enabled
        notifications receive it.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          maxLength={80}
          className="rounded-btn border-ink/15 placeholder:text-muted focus:border-ink w-full border bg-transparent p-3 text-[15px] outline-none"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Message"
          rows={3}
          maxLength={300}
          className="rounded-btn border-ink/15 placeholder:text-muted focus:border-ink w-full resize-none border bg-transparent p-3 text-[15px] outline-none"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Link when tapped (optional, e.g. /library)"
          maxLength={2000}
          className="rounded-btn border-ink/15 placeholder:text-muted focus:border-ink w-full border bg-transparent p-3 text-[15px] outline-none"
        />

        {status === 'sent' && result ? (
          <p className="text-muted text-sm" role="status">
            Sent to {result.sent} of {result.total}
            {result.failed > 0 ? ` · ${result.failed} failed` : ''}
            {result.pruned > 0 ? ` · ${result.pruned} stale removed` : ''}.
          </p>
        ) : null}
        {status === 'error' ? (
          <p className="text-muted text-sm" role="alert">
            {errorMsg ?? 'That didn’t send.'} Please try again.
          </p>
        ) : null}

        <Button onClick={() => void send()} loading={status === 'sending'} disabled={!canSend}>
          {status === 'sent' ? 'Send another' : 'Send notification'}
        </Button>
      </div>
    </div>
  )
}
