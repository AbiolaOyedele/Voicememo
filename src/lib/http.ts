import { NextResponse } from 'next/server'
import { isAppError } from '@/lib/errors'
import { logger } from '@/lib/logger'

/** Success envelope: `{ data }`. */
export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status })
}

/** Error envelope: `{ error: { code, message } }`. Never leaks internals. */
export function jsonError(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status })
}

/**
 * Translate a thrown value into the standard client error response. Known
 * {@link AppError}s pass their code/message/status through; anything else is
 * logged and returned as a generic 500 so no internals reach the client.
 */
export function toErrorResponse(error: unknown): NextResponse {
  if (isAppError(error)) {
    if (error.statusCode >= 500) {
      logger.error({ code: error.code, err: error.details }, error.message)
    }
    return jsonError(error.code, error.message, error.statusCode)
  }
  logger.error({ err: error }, 'Unhandled route error')
  return jsonError('INTERNAL_ERROR', 'Something went wrong on our end.', 500)
}
