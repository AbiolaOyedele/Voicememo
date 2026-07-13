'use client'

import { useEffect, useState } from 'react'

/**
 * Whether the signed-in user is an admin, resolved from /api/v1/me. The server
 * owns the allowlist; this only ever learns a boolean, so the admin emails are
 * never shipped to the client. Returns false while loading.
 */
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/v1/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: { isAdmin?: boolean } } | null) => {
        if (active && json?.data?.isAdmin) setIsAdmin(true)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  return isAdmin
}
