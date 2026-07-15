'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

type Status = 'idle' | 'sending' | 'sent' | 'error'

interface KingsMenButtonProps {
  /** Feedback endpoint to report to. Defaults to this app's own same-origin route. */
  endpoint?: string
}

/**
 * The 404 page's one action: reports the broken link to the feedback inbox,
 * then sends the visitor back where they came from. Fires the report and
 * navigates regardless of whether the send succeeded — a failed report
 * shouldn't trap someone on a dead page.
 */
export function KingsMenButton({ endpoint = '/api/v1/feedback' }: KingsMenButtonProps) {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('idle')

  async function handleClick(): Promise<void> {
    setStatus('sending')
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 5000)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'bug',
          message: `Auto-report: 404 at ${window.location.href}`,
          page_url: window.location.pathname,
          app_version: null,
        }),
        signal: controller.signal,
      })
      setStatus(res.ok ? 'sent' : 'error')
    } catch {
      setStatus('error')
    } finally {
      window.clearTimeout(timeout)
      window.setTimeout(() => {
        if (window.history.length > 1) router.back()
        else router.push('/')
      }, 700)
    }
  }

  const label =
    status === 'sent'
      ? 'Word sent — off you go'
      : status === 'error'
        ? "Couldn't reach them, but off you go"
        : "Tell the King's Men to Fix It"

  return (
    <Button onClick={() => void handleClick()} loading={status === 'sending'} fullWidth>
      {label}
    </Button>
  )
}
