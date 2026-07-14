import { PostHog } from 'posthog-node'
import { publicEnv } from '@/config/env'

/**
 * Fire-and-forget server-side event capture. No-ops when
 * NEXT_PUBLIC_POSTHOG_KEY is unset. A fresh client is created per call with
 * an immediate flush — API routes on Vercel can suspend right after
 * returning a response, so events must be sent before that happens rather
 * than batched for a later flush.
 */
export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  if (!publicEnv.NEXT_PUBLIC_POSTHOG_KEY) return
  const client = new PostHog(publicEnv.NEXT_PUBLIC_POSTHOG_KEY, {
    host: publicEnv.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    flushAt: 1,
    flushInterval: 0,
  })
  try {
    client.capture({
      distinctId,
      event,
      // This PostHog project is shared with Fey — tag every event so the two
      // apps stay distinguishable in shared dashboards/insights.
      properties: { ...properties, app: 'dumpty' },
    })
    await client.shutdown()
  } catch {
    // Analytics must never break the request it's attached to.
  }
}
