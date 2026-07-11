'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'

/** Tab order for swipe navigation: Library ← Record → Account. */
const ORDER = ['/library', '/record', '/account']

const SWIPE_THRESHOLD = 60 // px horizontal
const MAX_VERTICAL = 50 // px — ignore mostly-vertical gestures (scrolling)

/**
 * Enables horizontal swipe navigation between the three main tabs. Returns a ref
 * to attach to the swipeable container. Swiping left goes to the next tab
 * (toward Account); swiping right goes to the previous (toward Library).
 */
export function useSwipeNav<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let startX = 0
    let startY = 0
    let tracking = false

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      startX = t.clientX
      startY = t.clientY
      tracking = true
    }

    const onEnd = (e: TouchEvent) => {
      if (!tracking) return
      tracking = false
      const t = e.changedTouches[0]
      if (!t) return
      const dx = t.clientX - startX
      const dy = t.clientY - startY
      if (Math.abs(dy) > MAX_VERTICAL || Math.abs(dx) < SWIPE_THRESHOLD) return

      const current = ORDER.findIndex((p) => pathname === p || pathname.startsWith(`${p}/`))
      if (current === -1) return

      const nextIndex = dx < 0 ? current + 1 : current - 1
      const target = ORDER[nextIndex]
      if (target) router.push(target)
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchend', onEnd)
    }
  }, [pathname, router])

  return ref
}
