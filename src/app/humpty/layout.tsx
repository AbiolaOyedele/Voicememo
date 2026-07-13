import type { ReactNode } from 'react'
import { notFound, redirect } from 'next/navigation'
import { requireAdmin } from '@/middleware/auth'
import { isAppError } from '@/lib/errors'

export const metadata = {
  title: 'Dumpty Admin',
  robots: { index: false, follow: false },
}

/**
 * Admin-only gate for /humpty. Unauthenticated visitors go to log in;
 * authenticated non-admins get a 404 (the dashboard's existence is not
 * revealed). Runs on every /humpty request before any child renders. The
 * visual chrome lives in AdminShell.
 */
export default async function HumptyLayout({ children }: { children: ReactNode }) {
  try {
    await requireAdmin()
  } catch (error) {
    if (isAppError(error) && error.code === 'AUTH_SESSION_REQUIRED') {
      redirect('/login?next=/humpty')
    }
    notFound()
  }

  return children
}
