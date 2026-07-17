/** Kinds of in-app message the admin can send to a user. */
export type UserMessageKind = 'feedback_reply' | 'announcement'

/**
 * An in-app message from the admin to one user (row of
 * `idea_dump_user_messages`), shown in the Account tab until dismissed.
 */
export interface UserMessage {
  id: string
  kind: UserMessageKind
  title: string
  body: string
  createdAt: string
}
