import { NextResponse } from 'next/server'
import { getOptionalUser, isAdminEmail } from '@/middleware/auth'
import { jsonOk, toErrorResponse } from '@/lib/http'

// GET /api/v1/me
// Auth: optional. Returns lightweight identity flags for the client — notably
// whether the signed-in user is an admin, so the app can reveal the /humpty
// entry only to allowlisted emails without exposing the allowlist itself.
export async function GET(): Promise<NextResponse> {
  try {
    const user = await getOptionalUser()
    return jsonOk({
      signedIn: Boolean(user),
      isAdmin: isAdminEmail(user?.email),
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}
