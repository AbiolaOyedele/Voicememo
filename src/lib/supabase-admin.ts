import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/config/env.server'

/**
 * Service-role Supabase client. Bypasses RLS — server-only, never import this
 * from a Client Component (kept out of `lib/supabase.ts`, which the browser
 * client also lives in, so the service-role key can never end up in a client
 * bundle). Used for privileged operations the request-scoped client can't do,
 * like deleting an auth user.
 */
export function createAdminSupabaseClient(): SupabaseClient {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
