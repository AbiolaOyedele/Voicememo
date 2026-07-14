import { NextResponse, type NextRequest } from 'next/server'
import { Receiver } from '@upstash/qstash'
import { z } from 'zod'
import { env } from '@/config/env.server'
import { deliverReminder } from '@/services/reminders.service'
import { jsonOk, jsonError, toErrorResponse } from '@/lib/http'

// POST /api/v1/reminders/deliver
// Auth: QStash signature (Upstash-Signature header) — not a user session.
// Called by Upstash QStash when a scheduled reminder is due.
// Body: { reminderId: string }

const bodySchema = z.object({ reminderId: z.string().uuid() })

async function verifyQstashSignature(req: NextRequest, rawBody: string): Promise<boolean> {
  if (!env.QSTASH_CURRENT_SIGNING_KEY || !env.QSTASH_NEXT_SIGNING_KEY) return false
  const signature = req.headers.get('upstash-signature')
  if (!signature) return false

  const receiver = new Receiver({
    currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
  })
  try {
    return await receiver.verify({
      signature,
      body: rawBody,
      url: `${env.NEXT_PUBLIC_SITE_URL}/api/v1/reminders/deliver`,
    })
  } catch {
    return false
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text()

  const verified = await verifyQstashSignature(req, rawBody)
  if (!verified) {
    return jsonError('REMINDER_DELIVER_UNAUTHORIZED', 'Not authorized.', 401)
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return jsonError('REMINDER_DELIVER_INVALID_BODY', 'Invalid payload.', 400)
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    // Not a shape we act on — acknowledge so QStash doesn't retry a payload
    // we'll never process.
    return jsonOk({ ok: true, ignored: true })
  }

  try {
    await deliverReminder(parsed.data.reminderId)
    return jsonOk({ ok: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
