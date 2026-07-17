import { Spinner } from '@/components/ui/Spinner'

/**
 * Instant route-level fallback for the dump detail pair. With full prefetch on
 * library cards this rarely shows; it covers cold deep-links so navigation
 * never sits on a blank screen while the route payload loads.
 */
export default function DumpDetailLoading() {
  return (
    <div className="bg-canvas text-muted flex h-[100dvh] items-center justify-center">
      <Spinner />
    </div>
  )
}
