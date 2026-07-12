'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDownIcon } from '@/components/ui/icons'
import changelogData from '@/data/changelog.json'

interface ChangelogEntry {
  version: string
  date: string
  title: string
  features: string[]
  improvements: string[]
  fixes: string[]
}

const entries = changelogData as ChangelogEntry[]

/**
 * Small, static version display: current version plus what changed in it,
 * with older releases tucked behind a plain in-page toggle. No popup — this
 * is deliberately just text, sourced from the git-committed changelog.json.
 */
export function ChangelogSection() {
  const [expanded, setExpanded] = useState(false)
  const [latest, ...older] = entries
  if (!latest) return null

  const bullets = [...latest.features, ...latest.improvements, ...latest.fixes]

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-muted px-1 text-xs tracking-wide uppercase">Version</h2>
      <div className="rounded-card border-ink/10 flex flex-col gap-2 border p-4">
        <p className="text-[15px]">
          v{latest.version} — {latest.title}
        </p>
        <ul className="text-muted flex flex-col gap-1 text-xs">
          {bullets.slice(0, 4).map((bullet) => (
            <li key={bullet}>· {bullet}</li>
          ))}
        </ul>

        {older.length > 0 ? (
          <>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="text-muted hover:text-ink flex min-h-11 items-center gap-1 self-start text-xs"
            >
              <span className="underline underline-offset-4">
                {expanded ? 'Hide older versions' : 'Show older versions'}
              </span>
              <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDownIcon size={12} />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {expanded ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <ul className="flex flex-col gap-2 pt-1">
                    {older.map((entry) => (
                      <li key={entry.version} className="flex items-baseline justify-between gap-2">
                        <span className="text-xs">
                          v{entry.version} — {entry.title}
                        </span>
                        <span className="text-muted shrink-0 text-xs">{entry.date}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </>
        ) : null}
      </div>
    </section>
  )
}
