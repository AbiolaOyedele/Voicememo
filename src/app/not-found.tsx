import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { KingsMenButton } from '@/components/features/errors/KingsMenButton'

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <Logo as="span" className="text-3xl" />
      <p className="text-muted mt-2 text-xs tracking-wide uppercase">404</p>
      <h1 className="mt-4 text-2xl leading-snug sm:text-3xl">Dumpty had a great fall.</h1>
      <p className="text-muted mt-3 max-w-xs text-[15px] sm:text-base">
        This page came off the wall and shattered somewhere we can&apos;t find it. All the
        king&apos;s horses looked — but they&apos;re horses, so.
      </p>

      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <KingsMenButton />
        <Link
          href="/record"
          className="text-muted hover:text-ink min-h-11 text-center text-sm underline underline-offset-4"
        >
          Or just take me back to Dumpty
        </Link>
      </div>
    </main>
  )
}
