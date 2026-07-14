import type { Metadata } from 'next'
import { CinematicHero } from '@/components/ui/cinematic-landing-hero'
import { LandingNav } from '@/components/ui/landing-nav'
import { publicEnv } from '@/config/env'

/**
 * Root route — the Dumpty marketing landing page, served on the www subdomain.
 * The app itself (login, record, etc.) lives on a separate subdomain, so the
 * "Try Dumpty" CTA must be an absolute cross-origin link rather than a relative
 * path.
 */
export const metadata: Metadata = {
  title: 'Dumpty · You had a great idea. Then you lost it.',
  description:
    'Dumpty is a voice notes app that transcribes your rambling thoughts and organizes them into clean, readable ideas. Say it before you forget it.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Dumpty · You had a great idea. Then you lost it.',
    description:
      'Dumpty is an idea capture app that turns your spoken thoughts into clean, organized notes. Never lose an idea again.',
    type: 'website',
  },
}

export default function RootPage() {
  const ctaHref = `${publicEnv.NEXT_PUBLIC_SITE_URL}/login`
  return (
    <main className="bg-canvas text-ink min-h-screen w-full overflow-x-hidden">
      <LandingNav ctaHref={ctaHref} />
      <CinematicHero ctaHref={ctaHref} />
    </main>
  )
}
