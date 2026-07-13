import { Spinner } from '@/components/ui/Spinner'

/** Shared bits for the admin panels — kept together so the panels stay lean. */

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border-ink/10 border p-4">
      <div className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</div>
      <div className="text-muted mt-1 text-xs">{label}</div>
    </div>
  )
}

export function PanelLoading() {
  return (
    <div className="flex justify-center py-16">
      <Spinner size={22} />
    </div>
  )
}

export function PanelError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="text-muted text-sm">Couldn’t load that. Check your connection.</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-btn border-ink/15 min-h-11 border px-4 text-sm"
      >
        Try again
      </button>
    </div>
  )
}
