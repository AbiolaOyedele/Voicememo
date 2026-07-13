import type { NextRequest } from 'next/server'
import { AppError } from '@/lib/errors'

/**
 * Fixed-window rate limiter.
 *
 * NOTE: This is an in-memory limiter — correct for a single instance and good
 * enough for MVP abuse protection. On serverless/multi-instance deploys it does
 * not share state across instances; move to a distributed store (e.g. Upstash
 * Redis) before relying on it for hard cost guarantees.
 */
interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export interface RateLimit {
  limit: number
  windowMs: number
}

/** Sensible defaults. Paid third-party endpoints get the stricter limit. */
export const RATE_LIMITS = {
  paid: { limit: 20, windowMs: 60_000 }, // upload/transcribe/process
  standard: { limit: 120, windowMs: 60_000 },
  public: { limit: 10, windowMs: 60_000 }, // unauthenticated endpoints, e.g. feedback
} as const

/**
 * Enforce a rate limit for `identifier` (e.g. `userId:upload`). Throws
 * {@link AppError} 429 when the window is exhausted.
 */
export function enforceRateLimit(identifier: string, opts: RateLimit): void {
  const now = Date.now()
  const bucket = buckets.get(identifier)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(identifier, { count: 1, resetAt: now + opts.windowMs })
    return
  }

  if (bucket.count >= opts.limit) {
    throw new AppError(
      429,
      'You are doing that too often. Please wait a moment and try again.',
      'RATE_LIMITED',
    )
  }
  bucket.count += 1
}

/**
 * Best-effort client identifier for rate-limiting unauthenticated requests.
 * Trusts `x-forwarded-for`, which Vercel's edge sets/overwrites itself (not
 * client-controllable in that deployment); off-platform this header could be
 * spoofed, so this is a soft throttle, not a hard guarantee — same caveat as
 * the in-memory limiter above.
 */
export function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}
