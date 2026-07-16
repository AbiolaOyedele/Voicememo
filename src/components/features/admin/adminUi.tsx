import { Spinner } from '@/components/ui/Spinner'
import { RefreshIcon } from '@/components/ui/icons'
import { cn } from '@/lib/utils'

/** Shared bits for the admin panels — kept together so the panels stay lean. */

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** "3h 24m" / "42 min" for total recorded audio. */
export function fmtMinutes(totalSeconds: number): string {
  const mins = Math.round(totalSeconds / 60)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

/** Panel title row with a manual refresh action. */
export function PanelHeader({
  title,
  onRefresh,
  refreshing = false,
}: {
  title: string
  onRefresh: () => void
  refreshing?: boolean
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg tracking-tight">{title}</h2>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        aria-label="Refresh"
        className="text-muted hover:text-ink border-ink/10 flex h-11 w-11 items-center justify-center rounded-full border transition-colors disabled:opacity-50"
      >
        <span className={cn(refreshing && 'animate-spin')}>
          <RefreshIcon size={17} />
        </span>
      </button>
    </div>
  )
}

export function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-card border-ink/10 border p-4">
      <div className="text-2xl font-semibold tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
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
