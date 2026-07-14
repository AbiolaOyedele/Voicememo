'use client'

import { useState } from 'react'
import { CenterDialog } from '@/components/ui/CenterDialog'
import changelogData from '@/data/changelog.json'
import type { ChangelogEntry } from '@/types/changelog'

const entries = changelogData as ChangelogEntry[]

const GROUPS: {
  key: keyof Pick<ChangelogEntry, 'features' | 'improvements' | 'fixes'>
  label: string
}[] = [
  { key: 'features', label: 'New' },
  { key: 'improvements', label: 'Improved' },
  { key: 'fixes', label: 'Fixed' },
]

/**
 * "Version <n>" trigger that opens the full changelog in a centered dialog
 * (current release grouped into New / Improved / Fixed, then older versions).
 * Sourced from the git-committed changelog.json.
 */
export function ChangelogSection() {
  const [open, setOpen] = useState(false)
  const [latest, ...older] = entries
  if (!latest) return null

  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted hover:text-ink flex min-h-11 items-center gap-1 px-1 text-xs tracking-wide uppercase"
      >
        Version {latest.version}
      </button>

      <CenterDialog open={open} title="What's new" onClose={() => setOpen(false)}>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[15px]">
                v{latest.version} — {latest.title}
              </p>
              <span className="text-muted shrink-0 text-xs">{latest.date}</span>
            </div>

            {GROUPS.map(({ key, label }) =>
              latest[key].length > 0 ? (
                <div key={key} className="flex flex-col gap-1.5">
                  <span className="text-muted text-[11px] tracking-wide uppercase">{label}</span>
                  <ul className="flex flex-col gap-1.5">
                    {latest[key].map((item) => (
                      <li key={item} className="text-ink/80 flex gap-2 text-sm">
                        <span className="text-muted">·</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
          </div>

          {older.length > 0 ? (
            <div className="border-ink/10 flex flex-col gap-2 border-t pt-4">
              <span className="text-muted text-[11px] tracking-wide uppercase">Earlier</span>
              <ul className="flex flex-col gap-1.5">
                {older.map((entry) => (
                  <li key={entry.version} className="flex items-baseline justify-between gap-2">
                    <span className="text-sm">
                      v{entry.version} — {entry.title}
                    </span>
                    <span className="text-muted shrink-0 text-xs">{entry.date}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </CenterDialog>
    </section>
  )
}
