'use client'

import { useEffect } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { clearDumpsCache } from '@/lib/dumps-cache'

/**
 * Belt-and-suspenders alongside the explicit clears in SignOutButton and
 * DeleteAccountButton: listens for Supabase auth state changes and purges the
 * on-device dumps cache on sign-out, or when a different account signs in on
 * this browser. Covers paths those buttons can't observe — a session that
 * simply expires, a sign-out in another tab, a manually cleared cookie —
 * where the next account signed in here must never paint from a previous
 * account's cached ideas.
 */
export function useAuthCacheGuard(): void {
  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    let lastUserId: string | null = null

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user.id ?? null
      if (
        event === 'SIGNED_OUT' ||
        (lastUserId !== null && userId !== null && userId !== lastUserId)
      ) {
        clearDumpsCache()
      }
      lastUserId = userId
    })

    return () => data.subscription.unsubscribe()
  }, [])
}
