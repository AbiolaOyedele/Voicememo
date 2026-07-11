'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentType } from 'react'
import { LibraryIcon, MicIcon, UserIcon } from './icons'

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
 * Fixed bottom navigation with exactly three destinations. Safe-area aware for
 * iOS PWA. The active tab is derived from the current path.
 */
export function TabBar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Primary"
      className="pb-safe border-ink/10 bg-canvas/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 py-2 transition-colors ${
                  active ? 'text-ink' : 'text-muted'
                }`}
              >
                <Icon size={24} />
                <span className="text-[11px] font-medium">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
