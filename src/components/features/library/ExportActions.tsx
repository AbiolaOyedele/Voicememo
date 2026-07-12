'use client'

import { useState } from 'react'
import type { Dump } from '@/types/dump'
import { downloadTextFile, dumpFilename, dumpToMarkdown, dumpToPlainText } from '@/lib/export'

/**
 * Export/share actions for a dump: copy, download as markdown or text, or print
 * (Save as PDF). Rendered under the dump content.
 */
export function ExportActions({ dump }: { dump: Dump }) {
  const [copied, setCopied] = useState(false)

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(dumpToMarkdown(dump))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard unavailable — no-op.
    }
  }

  const btn =
    'rounded-btn border border-ink/10 px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.04]'

  return (
    <div data-no-print className="border-ink/10 flex flex-wrap gap-2 border-t pt-4">
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
