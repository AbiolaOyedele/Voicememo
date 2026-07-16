import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/middleware/auth'
import { updateFeedbackItem } from '@/services/admin.service'
import { jsonOk, toErrorResponse } from '@/lib/http'

type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/v1/admin/feedback/[id]
// Auth: admin only. Body: { done?: boolean, response?: string }
// Checks a feedback item off (or back on) and/or sends a reply; either action
// queues an in-app message for the submitter. Returns the updated record.
export async function PATCH(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    await requireAdmin()
    const { id } = await params
    const body: unknown = await req.json().catch(() => ({}))
    return jsonOk(await updateFeedbackItem(id, body))
  } catch (error) {
    return toErrorResponse(error)
  }
}
