import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { publicEnv } from '@/config/env'

/**
 * Supabase client for the browser (Client Components). Uses the anon key and
 * persists the session in cookies via `@supabase/ssr`.
 */
export function createBrowserSupabaseClient(): SupabaseClient {
  return createBrowserClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}

/**
 * Supabase client for Server Components, Route Handlers, and Server Actions.
 * Reads/writes the auth session from the request cookie store. `next/headers`
 * is imported dynamically so this module stays safe to import from the browser
 * client above.
 */
export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  return createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // `set` throws when called from a Server Component render. That is
            // expected: the middleware refreshes the session cookie instead.
          }
        },
      },
    },
  )
}
