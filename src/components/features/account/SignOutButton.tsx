'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { clearDumpsCache } from '@/lib/dumps-cache'
import { Button } from '@/components/ui/Button'

/** Signs the user out and returns them to the login screen. */
export function SignOutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function signOut(): Promise<void> {
    setLoading(true)
    // Purge unconditionally, before the network call — never leave this
    // account's cached ideas for the next person on this device, even if the
    // sign-out request itself fails.
    clearDumpsCache()
    try {
      const supabase = createBrowserSupabaseClient()
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch {
      setLoading(false)
    }
  }

  return (
    <Button variant="secondary" fullWidth loading={loading} onClick={signOut}>
      Sign out
    </Button>
  )
}
