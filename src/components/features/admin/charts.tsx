'use client'

import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * Lightweight interactive charts for the admin dashboard. Hand-rolled
 * (divs + SVG + Framer Motion) so no charting dependency is added. Touch-first:
 * the trend chart scrubs with a finger across one large target, the donut is
 * driven from its legend buttons — no tiny tap targets anywhere.
 */

export interface TrendPoint {
  label: string
  value: number
}

/**
 * Daily bar trend with a scrub-to-inspect tooltip: press or drag anywhere on
 * the chart and the nearest bar highlights with its label + value.
 */
export function TrendChart({ points, height = 132 }: { points: TrendPoint[]; height?: number }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const max = Math.max(1, ...points.map((p) => p.value))

  function scrub(clientX: number): void {
    const el = trackRef.current
    if (!el || points.length === 0) return
    const rect = el.getBoundingClientRect()
    const ratio = Math.min(0.999, Math.max(0, (clientX - rect.left) / rect.width))
    setSelected(Math.floor(ratio * points.length))
  }

  const sel = selected !== null ? points[selected] : null

  return (
    <div className="flex flex-col gap-1">
      {/* Readout line: selected day, or the series max as a scale hint. */}
      <div className="text-muted flex h-5 items-center justify-between text-xs tabular-nums">
        {sel ? (
          <>
            <span className="text-ink">{sel.label}</span>
            <span className="text-flame font-medium">{sel.value.toLocaleString()}</span>
          </>
        ) : (
          <>
            <span>Tap or drag to inspect</span>
            <span>max {max.toLocaleString()}</span>
          </>
        )}
      </div>

      <div
        ref={trackRef}
        role="img"
        aria-label="Daily trend chart"
        className="flex touch-none items-end gap-px"
        style={{ height }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          scrub(e.clientX)
        }}
        onPointerMove={(e) => {
          if (e.buttons > 0) scrub(e.clientX)
        }}
        onPointerUp={() => setSelected(null)}
        onPointerCancel={() => setSelected(null)}
      >
        {points.map((p, i) => (
          <div key={p.label} className="relative flex h-full flex-1 items-end">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.35, delay: Math.min(i * 0.012, 0.35), ease: 'easeOut' }}
              style={{ height: `${Math.max(3, (p.value / max) * 100)}%`, originY: 1 }}
              className={cn(
                'w-full rounded-t-[2px] transition-colors',
                selected === i ? 'bg-flame' : p.value === 0 ? 'bg-ink/10' : 'bg-flame/45',
              )}
            />
          </div>
        ))}
      </div>

      <div className="text-muted flex justify-between text-[10px]">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  )
}

export interface DonutSegment {
  label: string
  value: number
  /** Any CSS colour, e.g. 'var(--color-flame)' or 'rgba(...)'. */
  color: string
}

/**
 * Donut breakdown driven by its legend: tapping a legend row highlights the
 * segment and swaps the centre readout to that slice.
 */
export function DonutChart({ segments, centerLabel }: { segments: DonutSegment[]; centerLabel: string }) {
  const [selected, setSelected] = useState<number | null>(null)
  const total = segments.reduce((sum, s) => sum + s.value, 0)

  const R = 15.9155 // circumference ≈ 100 so percentages map straight to dash lengths
  const arcs = useMemo(() => {
    let offset = 0
    return segments.map((s) => {
      const pct = total > 0 ? (s.value / total) * 100 : 0
      const arc = { ...s, pct, offset }
      offset += pct
      return arc
    })
  }, [segments, total])

  const active = selected !== null ? arcs[selected] : null

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          <circle cx="18" cy="18" r={R} fill="none" strokeWidth="4" className="stroke-ink/10" />
          {arcs.map((a, i) => (
            <motion.circle
              key={a.label}
              cx="18"
              cy="18"
              r={R}
              fill="none"
              stroke={a.color}
              strokeLinecap="butt"
              initial={{ strokeWidth: 4, opacity: 0 }}
              animate={{
                strokeWidth: selected === i ? 5.4 : 4,
                opacity: selected === null || selected === i ? 1 : 0.35,
              }}
              transition={{ duration: 0.2 }}
              strokeDasharray={`${a.pct} ${100 - a.pct}`}
              strokeDashoffset={-a.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-semibold tabular-nums">
            {(active ? active.value : total).toLocaleString()}
          </span>
          <span className="text-muted max-w-[70%] text-[10px] leading-tight">
            {active ? active.label : centerLabel}
          </span>
        </div>
      </div>

      <ul className="flex min-w-0 flex-1 flex-col">
        {arcs.map((a, i) => (
          <li key={a.label}>
            <button
              type="button"
              onClick={() => setSelected(selected === i ? null : i)}
              aria-pressed={selected === i}
              className={cn(
                'flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left transition-colors',
                selected === i ? 'bg-ink/5' : 'hover:bg-ink/[0.03]',
              )}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: a.color }}
              />
              <span className="min-w-0 flex-1 truncate text-sm">{a.label}</span>
              <span className="text-muted shrink-0 text-xs tabular-nums">
                {a.value.toLocaleString()}
                {total > 0 ? ` · ${Math.round(a.pct)}%` : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Small pill segmented control for switching a chart's series or range. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="border-ink/10 flex w-fit gap-0.5 rounded-full border p-0.5 text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            'min-h-8 rounded-full px-3 transition-colors',
            value === o.value ? 'bg-flame text-white' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
