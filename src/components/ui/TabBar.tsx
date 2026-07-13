'use client'

import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import type { ComponentType } from 'react'
import { LibraryIcon, MicIcon, UserIcon } from './icons'
import { useTabCarousel } from '@/hooks/useTabCarousel'
import { cn } from '@/lib/utils'

interface Tab {
  href: string
  label: string
  Icon: ComponentType<{ size?: number }>
}

/** Tab order left→right. Record is the center/home tab. */
export const TABS: Tab[] = [
  { href: '/library', label: 'Library', Icon: LibraryIcon },
  { href: '/record', label: 'Record', Icon: MicIcon },
  { href: '/account', label: 'Account', Icon: UserIcon },
]

/**
 * Floating pill navigation with exactly three destinations. The active tab
 * expands to reveal its label with a spring animation. Safe-area aware for iOS
 * PWA. Monochrome to match the brand: active = ink tint, inactive = muted.
 */
export function TabBar() {
  const pathname = usePathname()
  const router = useRouter()
  // Inside the carousel, tabs scroll between mounted panels; on detail routes
  // there's no carousel, so fall back to a normal route navigation.
  const carousel = useTabCarousel()

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1.75rem)]">
      <motion.nav
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        aria-label="Primary"
        className="border-ink/10 bg-canvas pointer-events-auto flex items-center gap-1 rounded-full border p-1.5"
      >
        {TABS.map(({ href, label, Icon }) => {
          const active = carousel
            ? carousel.activeHref === href
            : pathname === href || pathname.startsWith(`${href}/`)
          return (
            <motion.button
              key={href}
              type="button"
              onClick={() => (carousel ? carousel.goToTab(href) : router.push(href))}
              whileTap={{ scale: 0.96 }}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex h-11 min-w-11 items-center justify-center rounded-full px-3 transition-colors',
                active ? 'bg-flame/12 text-flame' : 'text-muted hover:bg-ink/5',
              )}
            >
              <Icon size={22} />
              <motion.span
                initial={false}
                animate={{
                  width: active ? 'auto' : 0,
                  opacity: active ? 1 : 0,
                  marginLeft: active ? 8 : 0,
                }}
                transition={{
                  width: { type: 'spring', stiffness: 350, damping: 32 },
                  opacity: { duration: 0.18 },
                }}
                className="overflow-hidden text-sm whitespace-nowrap"
              >
                {label}
              </motion.span>
            </motion.button>
          )
        })}
      </motion.nav>
    </div>
  )
}
