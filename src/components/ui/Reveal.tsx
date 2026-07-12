'use client'

import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface RevealProps {
  children: ReactNode
  delay?: number
  className?: string
  /** Distance to rise from, in px. */
  y?: number
}

/**
 * Fades + rises children in on mount. Lets server-rendered sections (e.g.
 * Account, which fetches data server-side) get the same entrance motion as
 * client pages, without converting the whole page to a client component.
 */
export function Reveal({ children, delay = 0, className, y = 10 }: RevealProps) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
