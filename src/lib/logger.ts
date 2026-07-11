import pino, { type Logger } from 'pino'
import { env } from '@/config/env.server'

/**
 * Structured application logger (pino). Server-only. Emits JSON so logs are
 * ingestible by Vercel/Sentry. Sensitive fields are redacted — never log
 * passwords, tokens, session data, audio, or full transcripts.
 */
export const logger: Logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  base: null, // omit pid/hostname noise
  redact: {
    paths: [
      'password',
      '*.password',
      'token',
      '*.token',
      'access_token',
      'refresh_token',
      'authorization',
      'req.headers.authorization',
      'raw_transcript',
      'clean_transcript',
    ],
    remove: true,
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
})

/** Create a child logger bound to request/user context (e.g. { requestId, userId }). */
export function childLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings)
}
