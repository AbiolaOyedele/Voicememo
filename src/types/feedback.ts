/** Kind of feedback a user can submit. */
export type FeedbackType = 'bug' | 'feature' | 'other'

/** Triage state of a stored feedback row. */
export type FeedbackStatus = 'new' | 'triaged' | 'done'

/** A row in `idea_dump_feedback`. */
export interface Feedback {
  id: string
  user_id: string | null
  type: FeedbackType
  message: string
  page_url: string | null
  app_version: string | null
  user_agent: string | null
  status: FeedbackStatus
  created_at: string
}
