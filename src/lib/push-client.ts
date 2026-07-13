import { publicEnv } from '@/config/env'

/**
 * Browser-side Web Push helpers. All of this runs only in the browser and only
 * where the APIs exist — callers gate on {@link isPushSupported} first.
 */

/** Whether this browser can register for web push at all. */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** Convert a base64url VAPID key to the Uint8Array the Push API expects. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(normalized)
  // Back the array with a concrete ArrayBuffer so the type is Uint8Array<ArrayBuffer>,
  // which the Push API's applicationServerKey (BufferSource) accepts.
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i)
  return out
}

async function postJson(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${url} failed: ${res.status}`)
}

/**
 * Subscribe this browser to push and persist it server-side. Assumes the
 * Notification permission has already been granted. Returns false if push isn't
 * configured (no public VAPID key) so the caller can surface that gracefully.
 */
export async function subscribeToPush(): Promise<boolean> {
  const key = publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!key || !isPushSupported()) return false

  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    }))

  await postJson('/api/v1/push/subscribe', subscription.toJSON())
  return true
}

/** Unsubscribe this browser and drop the server-side record. */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  await postJson('/api/v1/push/unsubscribe', { endpoint: subscription.endpoint }).catch(() => {})
  await subscription.unsubscribe().catch(() => {})
}

/** Whether this browser currently holds an active push subscription. */
export async function getPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false
  const registration = await navigator.serviceWorker.ready
  return (await registration.pushManager.getSubscription()) !== null
}
