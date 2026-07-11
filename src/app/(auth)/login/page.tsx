'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createBrowserSupabaseClient } from '@/lib/supabase'

/**
 * Sign-in screen. The only auth entry point — Google OAuth via Supabase.
 * Handles its loading and error states inline.
 */
export default function LoginPage() {
  const [status, setStatus] = useState<'idle' | 'redirecting'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function signInWithGoogle(): Promise<void> {
    setError(null)
    setStatus('redirecting')
    try {
      const supabase = createBrowserSupabaseClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/callback?next=/record`,
        },
      })
      if (oauthError) throw oauthError
      // On success the browser is redirected to Google; nothing more to do here.
    } catch {
      setStatus('idle')
      setError('We could not start sign-in. Please try again.')
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Idea Dump</h1>
        <p className="text-muted max-w-xs">
          Speak your ideas freely. Get back a clean, readable version.
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <motion.button
          type="button"
          onClick={signInWithGoogle}
          disabled={status === 'redirecting'}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="rounded-btn bg-ink text-canvas flex h-12 min-h-11 w-full items-center justify-center gap-3 px-5 font-medium transition-opacity disabled:opacity-60"
        >
          <GoogleMark />
          {status === 'redirecting' ? 'Opening Google…' : 'Continue with Google'}
        </motion.button>

        {error ? (
          <p role="alert" className="text-muted text-center text-sm">
            {error}
          </p>
        ) : null}
      </div>
    </main>
  )
}

/** Monochrome Google "G" mark, inlined so no external asset is fetched. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12 11v2.8h4.65c-.2 1.2-1.4 3.52-4.65 3.52A5.3 5.3 0 0 1 12 6.68c1.62 0 2.7.7 3.32 1.3l2.26-2.18C16.14 4.5 14.28 3.7 12 3.7A8.3 8.3 0 1 0 20.2 12c0-.56-.06-.98-.14-1.4H12Z" />
    </svg>
  )
}
