'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renders children into `document.body`, outside the React tree's DOM position.
 *
 * Needed for full-screen overlays inside the main tab pages: the swipe track in
 * AppShell carries a CSS transform, and a transformed ancestor becomes the
 * containing block for `position: fixed`, which would otherwise offset a fixed
 * overlay off-screen. Portaling to body escapes that. Renders nothing until
 * mounted so server and first client render match.
 */
export function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return createPortal(children, document.body)
}
