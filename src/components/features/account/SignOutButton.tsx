'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'

/** Signs the user out and returns them to the login screen. */
export function SignOutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function signOut(): Promise<void> {
    setLoading(true)
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
