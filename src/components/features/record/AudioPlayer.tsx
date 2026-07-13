'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { formatDuration } from '@/utils/audio'

/**
 * Compact, on-brand audio player for reviewing a fresh recording before saving.
 * Replaces the browser's native `<audio controls>` (which can't be themed) with
 * a flame play/pause control and a seekable track in the app's faint-orange
 * palette. Keyboard-accessible via the range input under the visual track.
 */
export function AudioPlayer({ src, durationSeconds }: { src: string; durationSeconds?: number }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(durationSeconds ?? 0)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onTime = (): void => setCurrent(el.currentTime)
    const onMeta = (): void => {
      // MediaRecorder blobs commonly report duration as Infinity/NaN (a known
      // WebKit/Chromium quirk) and the browser's internal probe for it can
      // leave currentTime non-zero before playback ever starts. Prefer the
      // recorder's own wall-clock duration and resync the playhead to 0.
      const metaDuration = el.duration
      if (Number.isFinite(metaDuration) && metaDuration > 0) {
        setDuration(metaDuration)
      }
      el.currentTime = 0
      setCurrent(0)
    }
    const onEnd = (): void => {
      setPlaying(false)
      setCurrent(0)
    }
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('ended', onEnd)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('ended', onEnd)
    }
  }, [])

  const toggle = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    if (el.paused) {
      void el.play()
      setPlaying(true)
    } else {
      el.pause()
      setPlaying(false)
    }
  }, [])

  const seek = useCallback((value: number) => {
    const el = audioRef.current
    if (!el) return
    el.currentTime = value
    setCurrent(value)
  }, [])

  const pct = duration > 0 ? (current / duration) * 100 : 0

  return (
    <div className="flex w-full items-center gap-3">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />

      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play'}
        aria-pressed={playing}
        className="bg-flame flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
      >
        {playing ? <PauseGlyph /> : <PlayGlyph />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="relative flex items-center">
          {/* Visual track: faint-orange rail with a flame fill + thumb. */}
          <div className="bg-flame/15 relative h-1.5 w-full overflow-hidden rounded-full">
            <div className="bg-flame absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <span
            className="bg-flame pointer-events-none absolute h-3 w-3 -translate-x-1/2 rounded-full shadow"
            style={{ left: `${pct}%` }}
            aria-hidden
          />
          {/* Invisible range input on top for drag/keyboard seeking. */}
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={current}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Seek"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
        <div className="text-muted mt-1.5 flex justify-between text-xs tabular-nums">
          <span>{formatDuration(Math.floor(current))}</span>
          <span>{formatDuration(Math.floor(duration))}</span>
        </div>
      </div>
    </div>
  )
}

function PlayGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  )
}
