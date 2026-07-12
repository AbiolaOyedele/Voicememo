import type { FC } from 'react'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  /** Renders as an <h1> for the primary page heading; otherwise a <span>. */
  as?: 'h1' | 'span'
}

/**
 * The "Dumpty" wordmark, set in the Sketcha Kits display face (--font-logo).
 * Single source of truth for the app name so branding stays consistent.
 */
export const Logo: FC<LogoProps> = ({ className, as = 'span' }) => {
  const Tag = as
  return (
    <Tag
      className={cn('font-logo leading-none tracking-tight', className)}
      style={{ fontFamily: 'var(--font-logo)' }}
    >
      Dumpty
    </Tag>
  )
}
