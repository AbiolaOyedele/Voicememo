import type { Metadata } from 'next'
import { CinematicHero } from '@/components/ui/cinematic-landing-hero'

/**
 * Root route — the Dumpty marketing landing page. Signed-out visitors to the
 * bare domain see this; the "Try Dumpty" CTA sends them to /login. Signed-in
 * (and guest) users are routed straight to the app by the middleware.
 */
export const metadata: Metadata = {
  title: 'Dumpty · You had a great idea. Then you lost it.',
  description:
    'Dumpty turns your rambling thoughts into clean, sorted to-dos. Say it before you forget it.',
  openGraph: {
    title: 'Dumpty · You had a great idea. Then you lost it.',
    description: 'Dump your thoughts, get it sorted. Never lose an idea again.',
    type: 'website',
  },
}

export default function RootPage() {
  return (
    <main className="bg-canvas text-ink min-h-screen w-full overflow-x-hidden">
      <CinematicHero />
    </main>
  )
}
