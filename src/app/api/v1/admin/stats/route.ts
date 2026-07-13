import { NextResponse } from 'next/server'
import { requireAdmin } from '@/middleware/auth'
import { getDashboardMetrics } from '@/services/admin.service'
import { jsonOk, toErrorResponse } from '@/lib/http'

// GET /api/v1/admin/stats
// Auth: admin only. User/signup metrics, visitor reach, recording activity,
// and push-subscriber count.
export async function GET(): Promise<NextResponse> {
  try {
    await requireAdmin()
    return jsonOk(await getDashboardMetrics())
  } catch (error) {
    return toErrorResponse(error)
  }
}
