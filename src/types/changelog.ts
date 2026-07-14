/** One release entry in src/data/changelog.json. */
export interface ChangelogEntry {
  version: string
  date: string
  title: string
  features: string[]
  improvements: string[]
  fixes: string[]
  /**
   * Short one-line teaser for the "what's new" prompt shown once on a
   * visitor's next app open. Omit for routine/bug-fix-only releases — those
   * are worth a changelog line but not an interruption.
   */
  highlight?: string
}
