import { NextResponse, type NextRequest } from 'next/server'
import { requireUser } from '@/middleware/auth'
import { deleteAccount } from '@/services/account.service'
import { jsonOk, toErrorResponse } from '@/lib/http'

// DELETE /api/v1/account
// Auth: required
// Permanently deletes the signed-in user's account and all their data.
// Returns: { success: true }
export async function DELETE(_req: NextRequest): Promise<NextResponse> {
  try {
    const { user } = await requireUser()
    await deleteAccount(user)
    return jsonOk({ success: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
