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
  createdAt: string
}
