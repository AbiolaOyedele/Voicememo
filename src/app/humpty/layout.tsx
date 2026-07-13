import type { ReactNode } from 'react'
import { notFound, redirect } from 'next/navigation'
import { requireAdmin } from '@/middleware/auth'
import { isAppError } from '@/lib/errors'

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
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="text-lg font-medium">Dumpty Admin</h1>
          <span className="text-muted text-xs">{email}</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-6">{children}</main>
    </div>
  )
}
