/**
 * Runs once when the server process boots. We validate the full server
 * environment here so the app fails fast on a missing/malformed secret rather
 * than deep inside the first request. Skipped on the Edge runtime, which does
 * not carry server-only secrets.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateServerEnv } = await import('@/config/env.server')
    validateServerEnv()
  }
}
