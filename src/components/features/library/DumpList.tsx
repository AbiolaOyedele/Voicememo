'use client'

import type { Dump } from '@/types/dump'
import { groupByDay } from '@/utils/date'
import { DumpCard } from './DumpCard'

interface DumpListProps {
  dumps: Dump[]
  onTogglePin: (dump: Dump) => void
}

/**
 * Renders dumps grouped by day with sticky-feeling date headers. Pinned dumps
 * (already sorted first by the API) get their own leading group.
 */
export function DumpList({ dumps, onTogglePin }: DumpListProps) {
  const pinned = dumps.filter((d) => d.is_pinned)
  const rest = dumps.filter((d) => !d.is_pinned)
  const groups = groupByDay(rest)

  return (
    <div className="flex flex-col gap-6">
      {pinned.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-muted px-1 text-xs font-semibold tracking-wide uppercase">Pinned</h2>
          <div className="flex flex-col gap-2">
            {pinned.map((dump) => (
              <DumpCard key={dump.id} dump={dump} onTogglePin={onTogglePin} />
            ))}
          </div>
        </section>
      ) : null}

      {groups.map((group) => (
        <section key={group.label} className="flex flex-col gap-2">
          <h2 className="text-muted px-1 text-xs font-semibold tracking-wide uppercase">
            {group.label}
          </h2>
          <div className="flex flex-col gap-2">
            {group.items.map((dump) => (
              <DumpCard key={dump.id} dump={dump} onTogglePin={onTogglePin} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
