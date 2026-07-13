import type { SupabaseClient, User } from '@supabase/supabase-js'
import { AppError } from '@/lib/errors'
import { env } from '@/config/env.server'
import { createServerSupabaseClient } from '@/lib/supabase'

/** Parsed, lower-cased admin allowlist from ADMIN_EMAILS (comma-separated). */
function adminEmails(): string[] {
  return (env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

/** Whether an email is on the admin allowlist. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return adminEmails().includes(email.toLowerCase())
}

/**
 * Resolve the signed-in user and assert they're an admin. Throws {@link AppError}
 * 404 (not 403) for non-admins so the dashboard's existence isn't revealed —
 * the caller maps this to a not-found page/response.
 */
export async function requireAdmin(): Promise<{ supabase: SupabaseClient; user: User }> {
  const { supabase, user } = await requireUser()
  if (!isAdminEmail(user.email)) {
    throw new AppError(404, 'Not found.', 'ADMIN_ACCESS_DENIED')
  }
  return { supabase, user }
}

/**
 * Resolve the authenticated user for a server context (Route Handler / Server
 * Component / Server Action) and return it alongside the request-scoped Supabase
 * client. Throws {@link AppError} 401 when no valid session is present.
 *
 * Uses `getUser()` (which revalidates the token with Supabase) rather than
 * `getSession()` (which only reads the cookie and can be spoofed server-side).
 */
export async function requireUser(): Promise<{ supabase: SupabaseClient; user: User }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new AppError(401, 'You need to be signed in to do that.', 'AUTH_SESSION_REQUIRED')
  }

  return { supabase, user }
}

/**
 * Like {@link requireUser} but returns `null` instead of throwing when there is
 * no session. Useful for optional-auth pages that render differently when
 * signed out.
 */
export async function getOptionalUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
