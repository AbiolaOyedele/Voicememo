'use client'

import { useEffect, useState, type ReactNode } from 'react'
import type { Dump } from '@/types/dump'
import { dumpToMarkdown, dumpToPlainText } from '@/lib/export'
import { CenterDialog } from '@/components/ui/CenterDialog'
import { ShareIcon } from '@/components/ui/icons'

/**
 * One "Share & export" button that opens a popup with every way out of the
 * app: native share (where supported), copy, and print-to-PDF.
 */
export function ExportActions({ dump }: { dump: Dump }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  // Detected in an effect so SSR and the first client render agree (no share
  // row), then it appears on devices that support the Web Share API.
  const [canShare, setCanShare] = useState(false)
  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [])

  async function share(): Promise<void> {
    try {
      await navigator.share({ title: dump.title ?? 'Idea', text: dumpToPlainText(dump) })
      setOpen(false)
    } catch {
      // Share sheet dismissed or unavailable — no-op.
    }
  }

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(dumpToMarkdown(dump))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard unavailable — no-op.
    }
  }

  function printPdf(): void {
    // Close the dialog first so it isn't part of the printed page.
    setOpen(false)
    window.setTimeout(() => window.print(), 300)
  }

  return (
    <div data-no-print>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-btn border-ink/10 text-ink hover:bg-ink/[0.04] flex min-h-12 w-full items-center justify-center gap-2 border px-4 text-[15px] transition-colors"
      >
        <ShareIcon size={16} />
        Share & export
      </button>

      <CenterDialog open={open} title="Share & export" onClose={() => setOpen(false)}>
        <ul className="divide-ink/10 -mx-1 flex flex-col divide-y">
          {canShare ? (
            <ExportRow onClick={() => void share()} hint="Send to another app">
              Share…
            </ExportRow>
          ) : null}
          <ExportRow onClick={() => void copy()} hint="Formatted as markdown">
            {copied ? 'Copied ✓' : 'Copy text'}
          </ExportRow>
          <ExportRow onClick={printPdf} hint="Via your print dialog">
            Save as PDF
          </ExportRow>
        </ul>
      </CenterDialog>
    </div>
  )
}

function ExportRow({
  children,
  hint,
  onClick,
}: {
  children: ReactNode
  hint: string
  onClick: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="hover:bg-ink/[0.03] flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-1 text-left transition-colors"
      >
        <span className="text-[15px]">{children}</span>
        <span className="text-muted shrink-0 text-xs">{hint}</span>
      </button>
    </li>
  )
}
