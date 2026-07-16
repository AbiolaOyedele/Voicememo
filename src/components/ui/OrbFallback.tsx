'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { MicIcon } from './icons'

interface OrbFallbackProps {
  /** Recording state — switches the centre from a mic glyph to live-style bars. */
  recording: boolean
  className?: string
}

const BAR_COUNT = 21

/**
 * Deterministic per-bar animation shape so the equaliser looks organic without
 * Math.random() (which would differ between server and client renders). Bars
 * near the middle read taller, like a real voice level meter.
 */
function barProfile(i: number): { peak: number; duration: number; delay: number } {
  const centre = (BAR_COUNT - 1) / 2
  const closeness = 1 - Math.abs(i - centre) / centre
  const wobble = ((i * 7919) % 100) / 100
  return {
    peak: 0.35 + closeness * 0.5 + wobble * 0.15,
    duration: 0.9 + wobble * 0.6,
    delay: wobble * 0.4,
  }
}

/**
 * Non-WebGL stand-in for {@link VoicePoweredOrb}: a soft flame disc with a mic
 * glyph, swapping to an animated equaliser while recording. Purely visual —
 * recording state and tap handling stay with the parent button, exactly like
 * the orb it replaces.
 */
export function OrbFallback({ recording, className }: OrbFallbackProps) {
  return (
    <div
      className={cn('relative flex h-full w-full items-center justify-center', className)}
      aria-hidden
    >
      {/* Soft glow disc that echoes the orb's flame rim on light and dark canvases. */}
      <motion.div
        className="absolute inset-3 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(255,215,189,0.9) 0%, rgba(255,154,92,0.55) 48%, rgba(255,79,3,0.35) 72%, transparent 100%)',
        }}
        animate={recording ? { scale: [1, 1.05, 1] } : { scale: 1 }}
        transition={
          recording ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }
        }
      />
      <div className="border-flame/30 bg-canvas/70 absolute inset-10 rounded-full border backdrop-blur-sm" />

      {recording ? (
        <div className="relative flex h-16 items-center justify-center gap-1">
          {Array.from({ length: BAR_COUNT }).map((_, i) => {
            const { peak, duration, delay } = barProfile(i)
            return (
              <motion.span
                key={i}
                className="bg-flame w-1 rounded-full"
                style={{ height: 56, originY: 0.5 }}
                initial={{ scaleY: 0.15 }}
                animate={{ scaleY: [0.15, peak, 0.25, peak * 0.7, 0.15] }}
                transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
              />
            )
          })}
        </div>
      ) : (
        <div className="text-flame relative flex flex-col items-center gap-2">
          <MicIcon size={44} strokeWidth={1.6} />
        </div>
      )}
    </div>
  )
}
