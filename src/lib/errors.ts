/**
 * Application error carrying a client-safe message and a machine-readable code.
 * Services throw these for expected failures; route handlers translate them into
 * the consistent `{ error: { code, message } }` response shape.
 */
export class AppError extends Error {
  constructor(
    /** HTTP status code to return to the client. */
    public readonly statusCode: number,
    /** Plain-English message safe to show the user. */
    public readonly message: string,
    /** Machine-readable code in DOMAIN_ACTION_REASON format. */
    public readonly code: string,
    /** Internal-only diagnostic detail. Never sent to the client. */
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/** Type guard narrowing an unknown error to {@link AppError}. */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
