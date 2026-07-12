'use client'

import type { ReactNode } from 'react'

interface ChipProps {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
}

/**
 * Small pill for tags and filters. Not to be confused with a status/live
 * indicator — this is a plain, static label/filter control.
 */
export function Chip({ children, active = false, onClick, className = '' }: ChipProps) {
  const base =
    'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors'
  const tone = active ? 'bg-flame text-white' : 'bg-ink/5 text-ink'

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${base} ${tone} ${className}`}>
        {children}
      </button>
    )
  }
  return <span className={`${base} ${tone} ${className}`}>{children}</span>
}
