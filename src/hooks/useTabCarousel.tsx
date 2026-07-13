'use client'

import { createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'

export interface TabCarouselApi {
  /** href of the tab currently centred in the carousel. */
  activeHref: string
  /** Scroll the carousel to a tab by href (smooth). */
  goToTab: (href: string) => void
}

export const TabCarouselContext = createContext<TabCarouselApi | null>(null)

/** Carousel API when inside the swipe carousel, else null (e.g. a detail route). */
export function useTabCarousel(): TabCarouselApi | null {
  return useContext(TabCarouselContext)
}

/**
 * Navigate to a tab. Inside the carousel this scrolls between the already-
 * mounted panels (no route change); outside it (detail routes) it falls back to
 * a normal router navigation. Use this anywhere that used to `router.push` a
 * tab href — e.g. after saving a recording, or the empty-library CTA.
 */
export function useTabNav(): (href: string) => void {
  const carousel = useTabCarousel()
  const router = useRouter()
  return (href: string) => {
    if (carousel) carousel.goToTab(href)
    else router.push(href)
  }
}
