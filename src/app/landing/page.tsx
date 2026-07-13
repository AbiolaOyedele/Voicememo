import { CinematicHero } from '@/components/ui/cinematic-landing-hero'

/**
 * Dumpty marketing landing page. Scroll-pinned cinematic hero that introduces
 * the product on-brand: monochrome canvas, one flame accent, NoirPro type.
 */
export default function LandingPage() {
  return (
    <main className="min-h-screen w-full overflow-x-hidden">
      <CinematicHero />
    </main>
  )
}
