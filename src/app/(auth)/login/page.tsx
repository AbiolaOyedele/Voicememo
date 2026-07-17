'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { enableGuest } from '@/lib/guest'
import { Logo } from '@/components/ui/Logo'
import { AnalyticsConsentNotice } from '@/components/analytics/AnalyticsConsentNotice'
import { publicEnv } from '@/config/env'

/**
 * Sign-in screen. Email magic link (works with the enabled email provider) plus
 * Google OAuth (once the Google provider is enabled in Supabase). Handles its
 * loading and error states inline.
 */
export default function LoginPage() {
  const router = useRouter()
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
        options: {
          redirectTo: callbackUrl(),
          // Always show Google's account chooser. Without this, Google silently
          // reuses the active session, so after signing out (or deleting the
          // account) the user is re-authenticated as the same account with no
          // way to pick another. This is the "sign in with a different account"
          // affordance — handled by Google itself.
          queryParams: { prompt: 'select_account' },
        },
      })
      if (oauthError) throw oauthError
    } catch {
      setGoogleStatus('idle')
      setError('Google sign-in is not available yet. Use the email link instead.')
    }
  }

  function continueAsGuest(): void {
    enableGuest()
    router.push('/record')
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
    <main className="font-light flex flex-1 flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-card bg-canvas w-full max-w-xs p-5"
      >
        {/* Header: Dumpty wordmark + description */}
        <div className="flex flex-col items-center text-center">
          <Logo as="h1" className="text-4xl" />
          <p className="text-muted mt-1.5 text-sm">
            Speak your ideas freely. Get back a clean, readable version.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-col gap-3">
          {emailStatus === 'sent' ? (
            <div className="rounded-btn border-ink/10 bg-ink/[0.03] flex flex-col items-center gap-1 border p-4 text-center">
              <p>Check your email</p>
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
                className="rounded-btn border-ink/15 placeholder:text-muted focus:border-ink h-11 w-full border bg-transparent px-4 text-base outline-none"
              />
              <motion.button
                type="submit"
                disabled={emailStatus === 'sending'}
                whileTap={{ scale: 0.98 }}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.15 }}
                className="rounded-btn bg-flame flex h-11 min-h-11 w-full items-center justify-center gap-2 px-5 text-white transition-opacity disabled:opacity-60"
              >
                <MailMark />
                {emailStatus === 'sending' ? 'Sending…' : 'Continue with Email'}
              </motion.button>
            </form>
          )}

          {/* OR separator */}
          <div className="text-muted relative flex items-center justify-center text-xs uppercase">
            <span className="bg-ink/10 absolute inset-x-0 top-1/2 h-px" />
            <span className="bg-canvas relative px-2">or</span>
          </div>

          {/* Google */}
          <motion.button
            type="button"
            onClick={signInWithGoogle}
            disabled={googleStatus === 'redirecting'}
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.15 }}
            className="rounded-btn border-ink/15 text-ink hover:bg-ink/[0.04] flex h-11 min-h-11 w-full items-center justify-center gap-3 border px-5 transition-colors disabled:opacity-60"
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

        <p className="text-muted mt-4 text-center text-xs leading-snug">
          By continuing, you agree to Dumpty&apos;s{' '}
          <a
            href={`${publicEnv.NEXT_PUBLIC_MARKETING_URL}/terms`}
            className="underline underline-offset-4"
          >
            Terms
          </a>{' '}
          and{' '}
          <a
            href={`${publicEnv.NEXT_PUBLIC_MARKETING_URL}/privacy`}
            className="underline underline-offset-4"
          >
            Privacy Policy
          </a>
          .
        </p>
      </motion.div>

      <AnalyticsConsentNotice />

      {/* Skip → guest */}
      <motion.button
        type="button"
        onClick={continueAsGuest}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="text-muted hover:text-ink mt-5 min-h-11 text-sm underline underline-offset-4 transition-colors"
      >
        Continue as a guest
      </motion.button>
    </main>
  )
}

/** Mail glyph for the primary email action. */
function MailMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z" />
    </svg>
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
