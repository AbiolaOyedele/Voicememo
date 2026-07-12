'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createBrowserSupabaseClient } from '@/lib/supabase'

/**
 * Sign-in screen. Email magic link (works with the enabled email provider) plus
 * Google OAuth (once the Google provider is enabled in Supabase). Handles its
 * loading and error states inline.
 */
export default function LoginPage() {
  const [googleStatus, setGoogleStatus] = useState<'idle' | 'redirecting'>('idle')
  const [email, setEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  // These handlers only run in the browser, so window is always defined here.
  const callbackUrl = (): string => `${window.location.origin}/callback?next=/record`

  async function signInWithGoogle(): Promise<void> {
    setError(null)
    setGoogleStatus('redirecting')
    try {
      const supabase = createBrowserSupabaseClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callbackUrl() },
      })
      if (oauthError) throw oauthError
    } catch {
      setGoogleStatus('idle')
      setError('Google sign-in is not available yet. Use the email link instead.')
    }
  }

  async function sendMagicLink(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!email.trim()) return
    setError(null)
    setEmailStatus('sending')
    try {
      const supabase = createBrowserSupabaseClient()
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: callbackUrl() },
      })
      if (otpError) throw otpError
      setEmailStatus('sent')
    } catch {
      setEmailStatus('idle')
      setError('We could not send the link. Check the address and try again.')
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Idea Dump</h1>
        <p className="text-muted max-w-xs">
          Speak your ideas freely. Get back a clean, readable version.
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-4">
        {emailStatus === 'sent' ? (
          <div className="rounded-card border-ink/10 flex flex-col items-center gap-1 border p-5 text-center">
            <p className="font-semibold">Check your email</p>
            <p className="text-muted text-sm">
              We sent a sign-in link to <span className="text-ink">{email.trim()}</span>.
            </p>
          </div>
        ) : (
          <form onSubmit={sendMagicLink} className="flex flex-col gap-3">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label="Email address"
              className="rounded-btn border-ink/15 placeholder:text-muted focus:border-ink h-12 w-full border bg-transparent px-4 text-[15px] outline-none"
            />
            <motion.button
              type="submit"
              disabled={emailStatus === 'sending'}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="rounded-btn bg-ink text-canvas flex h-12 min-h-11 w-full items-center justify-center px-5 font-medium transition-opacity disabled:opacity-60"
            >
              {emailStatus === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
            </motion.button>
          </form>
        )}

        <div className="text-muted flex items-center gap-3 text-xs">
          <span className="bg-ink/10 h-px flex-1" />
          or
          <span className="bg-ink/10 h-px flex-1" />
        </div>

        <motion.button
          type="button"
          onClick={signInWithGoogle}
          disabled={googleStatus === 'redirecting'}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="rounded-btn border-ink/15 text-ink hover:bg-ink/[0.04] flex h-12 min-h-11 w-full items-center justify-center gap-3 border px-5 font-medium transition-colors disabled:opacity-60"
        >
          <GoogleMark />
          {googleStatus === 'redirecting' ? 'Opening Google…' : 'Continue with Google'}
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
