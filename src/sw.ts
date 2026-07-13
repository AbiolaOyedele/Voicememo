/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist } from 'serwist'

/**
 * Idea Dump service worker (compiled by @serwist/next). Precaches the app shell
 * and applies sensible runtime caching so the app opens offline. Excluded from
 * the app tsconfig — Serwist compiles it with WebWorker libs.
 */
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
})

serwist.addEventListeners()

interface PushPayload {
  title?: string
  body?: string
  url?: string
}

// Show a notification when a push arrives. Payload is the JSON the server sends
// via web-push ({ title, body, url }); fall back to sensible defaults if absent.
self.addEventListener('push', (event) => {
  let payload: PushPayload = {}
  try {
    payload = (event.data?.json() as PushPayload) ?? {}
  } catch {
    payload = { body: event.data?.text() }
  }

  const title = payload.title || 'Dumpty'
  const options: NotificationOptions = {
    body: payload.body || '',
    icon: '/icons/icon.svg',
    data: { url: payload.url || '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// Focus an existing app window (or open one) when a notification is tapped.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | undefined)?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          void client.focus()
          if ('navigate' in client) void (client as WindowClient).navigate(url)
          return
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
