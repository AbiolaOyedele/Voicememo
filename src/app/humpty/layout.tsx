import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireAdmin } from '@/middleware/auth'
import { isAppError } from '@/lib/errors'
import { HumptyNav } from '@/components/features/admin/HumptyNav'

export const metadata = {
  title: 'Dumpty Admin',
  robots: { index: false, follow: false },
}

/**
 * Admin-only shell for /humpty. Server-side gate: unauthenticated visitors are
 * sent to log in; authenticated non-admins get a 404 (the dashboard's existence
 * is not revealed). This runs on every /humpty request before any child renders.
 */
export default async function HumptyLayout({ children }: { children: ReactNode }) {
  let email: string | null = null
  try {
    const { user } = await requireAdmin()
    email = user.email ?? null
  } catch (error) {
    if (isAppError(error) && error.code === 'AUTH_SESSION_REQUIRED') {
      redirect('/login?next=/humpty')
    }
    notFound()
  }

  return (
    <div className="bg-canvas text-ink min-h-full">
      <header className="border-ink/10 border-b px-5 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-medium">Dumpty Admin</h1>
            <span className="text-muted truncate text-xs">{email}</span>
          </div>
          <Link
            href="/record"
            className="border-ink/15 text-muted hover:text-ink inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-sm"
          >
            ← Back to app
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-5 pt-5">
        <HumptyNav />
      </div>
      <main className="mx-auto max-w-3xl px-5 py-6">{children}</main>
    </div>
  )
}
