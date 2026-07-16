/** Kind of feedback a user can submit. */
export type FeedbackType = 'bug' | 'feature' | 'other'

/** Triage state of a stored feedback row. */
export type FeedbackStatus = 'new' | 'triaged' | 'done'

/** A persisted feedback submission (row of `idea_dump_feedback`). */
export interface FeedbackRecord {
  id: string
  userId: string | null
  type: FeedbackType
  message: string
  pageUrl: string | null
  appVersion: string | null
  status: FeedbackStatus
  /** Admin's reply, if one has been sent (also delivered as a user message). */
  response: string | null
  /** When the feedback was checked off as done. */
  resolvedAt: string | null
  createdAt: string
}
