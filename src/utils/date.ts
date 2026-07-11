/** Date helpers for the Library (pure, no side effects). */

/** Time like "3:45 PM". */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/** Human day label: "Today", "Yesterday", else e.g. "Mon, Jul 7". */
export function formatDayLabel(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(startOfToday.getFullYear() !== startOfDate.getFullYear() ? { year: 'numeric' } : {}),
  })
}

export interface DateGroup<T> {
  label: string
  items: T[]
}

/**
 * Group items (already sorted newest-first) by day label, preserving order.
 * Pinned items should be handled by the caller before grouping if needed.
 */
export function groupByDay<T extends { created_at: string }>(items: T[]): DateGroup<T>[] {
  const groups: DateGroup<T>[] = []
  let current: DateGroup<T> | null = null

  for (const item of items) {
    const label = formatDayLabel(item.created_at)
    if (!current || current.label !== label) {
      current = { label, items: [] }
      groups.push(current)
    }
    current.items.push(item)
  }
  return groups
}
