'use client'

import { usePushNotifications } from '@/hooks/usePushNotifications'

/**
 * Settings row to enable/disable push notifications for this device. Renders as
 * an <li> to sit inside the account settings list. Hides itself entirely where
 * push isn't supported (e.g. an iOS Safari tab), so it never shows a dead
 * control. On iOS the app must be installed to the Home Screen for this to work.
 */
export function NotificationsToggle() {
  const { supported, permission, subscribed, busy, error, enable, disable } = usePushNotifications()

  if (!supported) return null

  const blocked = permission === 'denied'

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0">
        <span className="text-[15px]">Notifications</span>
        {blocked ? (
          <p className="text-muted text-xs">Blocked — enable in your browser settings.</p>
        ) : error ? (
          <p className="text-muted text-xs">{error}</p>
        ) : (
          <p className="text-muted text-xs">Updates and new-feature nudges on this device.</p>
        )}
      </div>
      {blocked ? (
        <span className="text-muted shrink-0 text-xs">Off</span>
      ) : subscribed ? (
        <button
          type="button"
          onClick={() => void disable()}
          disabled={busy}
          className="text-muted hover:text-ink min-h-11 shrink-0 text-sm disabled:opacity-50"
        >
          {busy ? '…' : 'Turn off'}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void enable()}
          disabled={busy}
          className="rounded-btn bg-flame min-h-9 shrink-0 px-3 text-sm text-white disabled:opacity-50"
        >
          {busy ? 'Enabling…' : 'Enable'}
        </button>
      )}
    </li>
  )
}
