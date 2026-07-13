'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getPushSubscribed,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push-client'

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported'

export interface UsePushNotifications {
  /** True where the browser supports web push (false e.g. iOS Safari tab). */
  supported: boolean
  /** Current Notification permission, or 'unsupported'. */
  permission: PushPermission
  /** Whether this browser holds an active subscription. */
  subscribed: boolean
  /** In-flight enable/disable. */
  busy: boolean
  /** Plain-English error from the last action, if any. */
  error: string | null
  /** Request permission (if needed) and subscribe. */
  enable: () => Promise<void>
  /** Unsubscribe this browser. */
  disable: () => Promise<void>
}

/**
 * Manages this browser's web-push subscription: capability detection, the
 * Notification permission, and enable/disable. Safe to call on any device —
 * `supported` is false where push can't work, so UI can hide itself.
 */
export function usePushNotifications(): UsePushNotifications {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<PushPermission>('unsupported')
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isPushSupported()) return
    setSupported(true)
    setPermission(Notification.permission as PushPermission)
    void getPushSubscribed().then(setSubscribed)
  }, [])

  const enable = useCallback(async () => {
    setError(null)
    setBusy(true)
    try {
      const result = await Notification.requestPermission()
      setPermission(result as PushPermission)
      if (result !== 'granted') {
        setError('Notifications are blocked. Enable them in your browser settings.')
        return
      }
      const ok = await subscribeToPush()
      if (!ok) {
        setError('Push notifications are not available right now.')
        return
      }
      setSubscribed(true)
    } catch {
      setError('Could not enable notifications. Please try again.')
    } finally {
      setBusy(false)
    }
  }, [])

  const disable = useCallback(async () => {
    setError(null)
    setBusy(true)
    try {
      await unsubscribeFromPush()
      setSubscribed(false)
    } catch {
      setError('Could not turn off notifications. Please try again.')
    } finally {
      setBusy(false)
    }
  }, [])

  return { supported, permission, subscribed, busy, error, enable, disable }
}
