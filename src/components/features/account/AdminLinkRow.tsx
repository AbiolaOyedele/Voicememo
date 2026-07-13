'use client'

import Link from 'next/link'
import { useIsAdmin } from '@/hooks/useIsAdmin'

/**
 * Settings row linking to the admin dashboard (/humpty). Renders only for
 * allowlisted admins — everyone else gets nothing, so the dashboard is
 * invisible to normal users. Full navigation (it's outside the tab carousel).
 */
export function AdminLinkRow() {
  const isAdmin = useIsAdmin()
  if (!isAdmin) return null

  return (
    <li>
      <Link
        href="/humpty"
        className="flex min-h-11 w-full items-center justify-between px-4 py-3.5 text-left"
      >
        <span className="text-[15px]">Admin dashboard</span>
        <span className="text-muted text-xs">Metrics, feedback, push</span>
      </Link>
    </li>
  )
}
