import type { Metadata } from 'next'
import { CinematicHero } from '@/components/ui/cinematic-landing-hero'
import { LandingNav } from '@/components/ui/landing-nav'

/**
 * Root route — the Dumpty marketing landing page. Signed-out visitors to the
 * bare domain see this; the "Try Dumpty" CTA sends them to /login. Signed-in
 * (and guest) users are routed straight to the app by the middleware.
 */

/**
 * Hardcoded rather than derived from `NEXT_PUBLIC_SITE_URL` (and thus
 * `metadataBase`) on purpose — that env var points at app.trydumpty.com,
 * which is correct for the app's own absolute links but wrong here: it made
 * canonical/og:url/og:image resolve to app.trydumpty.com, whose `/`
 * immediately redirects to /login. This is purely the SEO-preferred URL for
 * this page; the app itself is single-origin (see middleware.ts).
 */
const MARKETING_SITE_URL = 'https://www.trydumpty.com'

export const metadata: Metadata = {
  title: 'Dumpty · You had a great idea. Then you lost it.',
  description:
    'Dumpty is a voice notes app that transcribes your rambling thoughts and organizes them into clean, readable ideas. Say it before you forget it.',
  alternates: {
    canonical: MARKETING_SITE_URL,
  },
  openGraph: {
    title: 'Dumpty · You had a great idea. Then you lost it.',
    description:
      'Dumpty is an idea capture app that turns your spoken thoughts into clean, organized notes. Never lose an idea again.',
    type: 'website',
    url: MARKETING_SITE_URL,
    images: [`${MARKETING_SITE_URL}/opengraph-image`],
  },
}

export default function RootPage() {
  return (
    <main className="bg-canvas text-ink min-h-screen w-full overflow-x-hidden">
      <LandingNav ctaHref="/login" />
      <CinematicHero ctaHref="/login" />
    </main>
  )
}
