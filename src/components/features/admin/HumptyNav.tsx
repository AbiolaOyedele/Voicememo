'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/humpty', label: 'Dashboard' },
  { href: '/humpty/marketing', label: 'Marketing' },
  { href: '/humpty/feedback', label: 'Feedback' },
] as const

/**
 * Admin section switcher — Dashboard / Marketing / Feedback. Mirrors the app's
 * pill-nav language (rounded, flame-tinted active state) so the dashboard feels
 * like part of Dumpty rather than a separate tool.
 */
export function HumptyNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Admin sections"
      className="border-ink/10 bg-canvas flex items-center gap-1 rounded-full border p-1"
    >
      {TABS.map(({ href, label }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex h-10 flex-1 items-center justify-center rounded-full px-3 text-sm transition-colors',
              active ? 'bg-flame/12 text-flame' : 'text-muted hover:bg-ink/5',
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
