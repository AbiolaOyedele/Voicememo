'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import type { Dump } from '@/types/dump'
import { Chip } from '@/components/ui/Chip'
import { StarIcon } from '@/components/ui/icons'
import { formatDuration } from '@/utils/audio'
import { formatTime } from '@/utils/date'

interface DumpCardProps {
  dump: Dump
  onTogglePin: (dump: Dump) => void
  index?: number
}

/** Preview line for a card: title, else first line of clean text, else status. */
function previewText(dump: Dump): string {
  if (dump.title) return dump.title
  if (dump.clean_transcript) return dump.clean_transcript.split('\n')[0] ?? dump.clean_transcript
  if (dump.status === 'ready') return 'Untitled idea'
  if (dump.status === 'failed') return 'Could not process this recording'
  return 'Processing your idea…'
}

const isPending = (s: Dump['status']) => s !== 'ready' && s !== 'failed'

export function DumpCard({ dump, onTogglePin, index = 0 }: DumpCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.99 }}
      transition={{
        opacity: { duration: 0.3, delay: Math.min(index, 8) * 0.035 },
        y: { duration: 0.3, delay: Math.min(index, 8) * 0.035 },
        scale: { duration: 0.12 },
      }}
    >
      <Link
        href={`/library/${dump.id}`}
        // Full prefetch (dynamic routes default to partial): the route payload
        // is fetched while the card is on screen, so tapping paints instantly
        // from the client cache with no server round-trip in the way.
        prefetch={true}
        className="rounded-card border-ink/10 bg-canvas flex flex-col gap-2 border p-4"
      >
        <div className="text-muted flex items-center justify-between text-xs">
          <span>
            {formatTime(dump.created_at)} · {formatDuration(dump.duration_seconds)}
          </span>
          <button
            type="button"
            aria-label={dump.is_pinned ? 'Unpin' : 'Pin'}
            aria-pressed={dump.is_pinned}
            onClick={(e) => {
              e.preventDefault()
              onTogglePin(dump)
            }}
            className="text-ink -m-2 p-2"
          >
            <StarIcon
              size={18}
              filled={dump.is_pinned}
              className={dump.is_pinned ? '' : 'text-muted'}
            />
          </button>
        </div>

        <div className="flex flex-col gap-0.5">
          <p
            className={`line-clamp-1 text-[15px] ${
              isPending(dump.status) ? 'text-muted' : 'text-ink'
            }`}
          >
            {previewText(dump)}
          </p>
          {dump.summary ? <p className="text-muted line-clamp-2 text-sm">{dump.summary}</p> : null}
        </div>

        {dump.tags.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {dump.tags.slice(0, 2).map((tag) => (
              <Chip key={tag}>{tag}</Chip>
            ))}
            {dump.tags.length > 2 ? (
              <span className="text-muted text-xs">+{dump.tags.length - 2}</span>
            ) : null}
          </div>
        ) : null}
      </Link>
    </motion.div>
  )
}
