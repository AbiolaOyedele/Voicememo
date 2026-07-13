'use client'

import { MAX_DURATION_SECONDS } from '@/types/dump'
import { formatDuration } from '@/utils/audio'

/**
 * Recording timer. Shows elapsed time and the 15-minute cap so the user always
 * knows how long they have left.
 */
export function Timer({ elapsedSeconds }: { elapsedSeconds: number }) {
  return (
    <div className="flex flex-col items-center gap-1" aria-live="polite">
      <span
        className="text-5xl tabular-nums tracking-tight"
        style={{ fontFamily: 'var(--font-noirpro)' }}
      >
        {formatDuration(elapsedSeconds)}
      </span>
      <span className="text-muted text-xs">of {formatDuration(MAX_DURATION_SECONDS)} max</span>
    </div>
  )
}
