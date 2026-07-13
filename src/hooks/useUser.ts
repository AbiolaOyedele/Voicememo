'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createBrowserSupabaseClient } from '@/lib/supabase'

interface UseUser {
  user: User | null
  /** True until the first auth check resolves. */
  loading: boolean
}

/**
 * Client-side current user. Reads the session from the browser Supabase client
 * and keeps it live via `onAuthStateChange`. Used by client panels that must be
 * mounted alongside other tabs (the swipe carousel) where a server component
 * can't be, e.g. the Account panel.
 */
export function useUser(): UseUser {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    let active = true

    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return
      setUser(data.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}
