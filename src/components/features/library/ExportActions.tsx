'use client'

import { useEffect, useState } from 'react'
import type { Dump } from '@/types/dump'
import { downloadTextFile, dumpFilename, dumpToMarkdown, dumpToPlainText } from '@/lib/export'
import { ShareIcon } from '@/components/ui/icons'

/**
 * Export/share actions for a dump: native share (where supported), copy,
 * download as markdown or text, or print (Save as PDF). Rendered under the
 * dump content.
 */
export function ExportActions({ dump }: { dump: Dump }) {
  const [copied, setCopied] = useState(false)
  // Detected in an effect so SSR and the first client render agree (no share
  // button), then it appears on devices that support the Web Share API.
  const [canShare, setCanShare] = useState(false)
  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [])

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(dumpToMarkdown(dump))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard unavailable — no-op.
    }
  }

  async function share(): Promise<void> {
    try {
      await navigator.share({
        title: dump.title ?? 'Idea',
        text: dumpToPlainText(dump),
      })
    } catch {
      // Share sheet dismissed or unavailable — no-op.
    }
  }

  const btn =
    'rounded-btn border border-ink/10 px-3 py-2 text-sm text-ink transition-colors hover:bg-ink/[0.04]'

  return (
    <div data-no-print className="border-ink/10 flex flex-wrap gap-2 border-t pt-4">
      {canShare ? (
        <button type="button" onClick={share} className={`${btn} flex items-center gap-1.5`}>
          <ShareIcon size={14} />
          Share
        </button>
      ) : null}
      <button type="button" onClick={copy} className={btn}>
        {copied ? 'Copied' : 'Copy'}
      </button>
      <button
        type="button"
        onClick={() =>
          downloadTextFile(dumpFilename(dump, 'md'), dumpToMarkdown(dump), 'text/markdown')
        }
        className={btn}
      >
        Markdown
      </button>
      <button
        type="button"
        onClick={() =>
          downloadTextFile(dumpFilename(dump, 'txt'), dumpToPlainText(dump), 'text/plain')
        }
        className={btn}
      >
        Text
      </button>
      <button type="button" onClick={() => window.print()} className={btn}>
        PDF
      </button>
    </div>
  )
}
