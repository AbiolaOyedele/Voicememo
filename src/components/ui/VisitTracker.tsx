'use client'

import { useEffect } from 'react'
import { trackVisit } from '@/lib/visitor'

/** Fires a single anonymous visit ping the first time a browser opens the app. Renders nothing. */
export function VisitTracker() {
  useEffect(() => {
    trackVisit()
  }, [])
  return null
}
