'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { MicIcon } from './icons'

interface OrbFallbackProps {
  /** Recording state — swaps the mic for the spinner and animates the bars. */
  recording: boolean
  /** Elapsed recording time, shown in the mono readout. */
  elapsedSeconds: number
  className?: string
}

const VISUALIZER_BARS = 36

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Non-WebGL stand-in for the voice orb, after the AI voice-input pattern: mic
 * glyph, mono timer, a strip of thin visualizer bars, and a status caption.
 * Purely visual — recording state, timing, and tap handling stay with the
 * parent button, exactly like the orb it replaces.
 */
export function OrbFallback({ recording, elapsedSeconds, className }: OrbFallbackProps) {
  // Bar heights are randomised per render; gate them to the client so the
  // server and first client render agree (same guard as the source pattern).
  const [isClient, setIsClient] = useState(false)
  useEffect(() => setIsClient(true), [])

  return (
    <div
      className={cn('flex h-full w-full flex-col items-center justify-center gap-2', className)}
      aria-hidden
    >
      <div
        className={cn(
          'flex h-16 w-16 items-center justify-center rounded-xl transition-colors',
          !recording && 'hover:bg-flame/10',
        )}
      >
        {recording ? (
          <div className="bg-flame h-6 w-6 animate-spin rounded-sm" style={{ animationDuration: '3s' }} />
        ) : (
          <MicIcon size={24} className="text-flame" />
        )}
      </div>

      <span
        className={cn(
          'font-mono text-sm transition-opacity duration-300',
          recording ? 'text-flame' : 'text-flame/40',
        )}
      >
        {formatTime(elapsedSeconds)}
      </span>

      <div className="flex h-4 w-48 items-center justify-center gap-0.5">
        {Array.from({ length: VISUALIZER_BARS }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-0.5 rounded-full transition-all duration-300',
              recording ? 'bg-flame animate-pulse' : 'bg-flame/25 h-1',
            )}
            style={
              recording && isClient
                ? {
                    height: `${20 + Math.random() * 80}%`,
                    animationDelay: `${i * 0.05}s`,
                  }
                : undefined
            }
          />
        ))}
      </div>

      <p className="text-flame/80 h-4 text-xs">{recording ? 'Listening...' : 'Tap to speak'}</p>
    </div>
  )
}
