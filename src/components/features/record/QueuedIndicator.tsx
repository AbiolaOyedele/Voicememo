'use client'

/**
 * Subtle informational notice shown when a recording is saved while offline.
 * Intentionally plain text — not a live/availability status pill.
 */
export function QueuedIndicator({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-btn bg-ink/5 text-muted px-4 py-2 text-center text-sm" role="status">
      {children}
    </p>
  )
}
