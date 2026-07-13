import type { Metadata } from 'next'

/**
 * Standalone layout for the marketing landing page. Deliberately isolated from
 * the (main) app shell (no TabBar, no auth) so the page can be reviewed and
 * iterated on without touching the live product. Not linked from anywhere;
 * the root route still redirects to /record.
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

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-canvas text-ink min-h-screen w-full overflow-x-hidden">{children}</div>
}
