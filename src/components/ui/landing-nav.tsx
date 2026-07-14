import Link from 'next/link'

export interface LandingNavProps {
  /** Where the "Try Dumpty" pill points. */
  ctaHref: string
}

/**
 * The landing page's only persistent wayfinding: a bare wordmark and a CTA
 * pill. Rendered as a sibling of `CinematicHero`, not nested inside it —
 * that component's root has `perspective` set, which makes any descendant
 * `position: fixed` resolve against the 3D containing block instead of the
 * viewport. Staying outside it is what keeps this genuinely fixed through
 * the pinned scroll sequence.
 */
export function LandingNav({ ctaHref }: LandingNavProps) {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
      <Link
        href="/"
        className="text-flame pointer-events-auto inline-flex min-h-11 items-center text-lg leading-none sm:text-xl"
        style={{ fontFamily: 'var(--font-logo)' }}
      >
        Dumpty
      </Link>
      <a
        href={ctaHref}
        className="bg-canvas text-flame rounded-btn focus:ring-flame pointer-events-auto inline-flex min-h-11 items-center justify-center px-5 text-sm font-medium shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
      >
        Try Dumpty
      </a>
    </header>
  )
}
