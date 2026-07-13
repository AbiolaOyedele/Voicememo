import { NextResponse } from 'next/server'
import { requireAdmin } from '@/middleware/auth'
import { getFeedback } from '@/services/admin.service'
import { jsonOk, toErrorResponse } from '@/lib/http'

// GET /api/v1/admin/feedback
// Auth: admin only. Recent feedback submissions + total count.
export async function GET(): Promise<NextResponse> {
  try {
    await requireAdmin()
    return jsonOk(await getFeedback())
  } catch (error) {
    return toErrorResponse(error)
  }
}
