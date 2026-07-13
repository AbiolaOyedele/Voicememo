'use client'

import { useState } from 'react'
import { CenterDialog } from '@/components/ui/CenterDialog'

interface UpcomingFeature {
  title: string
  description: string
}

/** Features on the roadmap, shown in the Coming soon dialog. */
const UPCOMING: UpcomingFeature[] = [
  {
    title: 'Idea validation',
    description:
      'Get instant, structured feedback on an idea — the strengths, the risks, and what to test next.',
  },
  {
    title: 'Type your ideas',
    description: 'Not somewhere you can talk? Jot an idea down as text instead of recording it.',
  },
  {
    title: 'Media upload',
    description: 'Attach photos, screenshots, and files to an idea so everything lives together.',
  },
]

/**
 * "Coming soon" trigger (styled like the version line) that opens a centered
 * dialog listing what we're building next. Static roadmap — no data fetching.
 */
export function ComingSoonSection() {
  const [open, setOpen] = useState(false)

  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted hover:text-ink flex min-h-11 items-center gap-1 px-1 text-xs tracking-wide uppercase"
      >
        Coming soon
      </button>

      <CenterDialog open={open} title="Coming soon" onClose={() => setOpen(false)}>
        <div className="flex flex-col gap-4">
          <p className="text-muted text-sm">What we&apos;re building next for Dumpty.</p>

          <ul className="divide-ink/10 flex flex-col divide-y">
            {UPCOMING.map((feature) => (
              <li key={feature.title} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                <span className="text-[15px]">{feature.title}</span>
                <span className="text-muted text-sm">{feature.description}</span>
              </li>
            ))}
          </ul>

          <p className="text-muted border-ink/10 border-t pt-4 text-xs">
            More on the way. Have a request? Send it through <span className="text-ink">Give feedback</span>.
          </p>
        </div>
      </CenterDialog>
    </section>
  )
}
