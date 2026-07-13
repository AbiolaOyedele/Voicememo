import { Resend } from 'resend'
import { env } from '@/config/env.server'

/**
 * Lazily-constructed Resend client. Server-only.
 *
 * Returns `null` when `RESEND_API_KEY` is not configured so callers can degrade
 * gracefully (report a clear error) rather than throwing at import time. The
 * instance is memoized across requests.
 */
let client: Resend | null = null

export function getResendClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null
  if (!client) client = new Resend(env.RESEND_API_KEY)
  return client
}
