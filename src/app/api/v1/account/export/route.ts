import { NextResponse, type NextRequest } from 'next/server'
import { requireUser } from '@/middleware/auth'
import { exportAccountData } from '@/services/account.service'
import { toErrorResponse } from '@/lib/http'

// GET /api/v1/account/export
// Auth: required
// Returns the signed-in user's account and notes as a downloadable JSON file
// (GDPR Art. 15/20 — right of access and data portability).
export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    const { supabase, user } = await requireUser()
    const data = await exportAccountData(supabase, user)
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'content-disposition': 'attachment; filename="dumpty-data-export.json"',
      },
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}
