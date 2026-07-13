'use client'

import Link from 'next/link'

/** A normal in-app button that leaves the admin area for the recorder. */
export function BackToAppButton() {
  return (
    <Link
      href="/record"
      className="rounded-btn border-ink/15 text-ink hover:bg-ink/[0.04] flex h-12 w-full items-center justify-center border text-[15px] transition-colors"
    >
      Back to app
    </Link>
  )
}
