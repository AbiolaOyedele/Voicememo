import type { Dump } from '@/types/dump'

/**
 * Client-side export helpers: turn a dump into markdown / plain text and trigger
 * a file download. PDF is handled via the browser's print dialog (Save as PDF)
 * so no heavy dependency is needed.
 */

function dumpBody(dump: Dump): {
  title: string
  sections: Array<{ label?: string; content: string }>
} {
  const title = dump.title ?? 'Untitled idea'
  if (dump.segments && dump.segments.length > 0) {
    return { title, sections: dump.segments.map((s) => ({ label: s.label, content: s.content })) }
  }
  return { title, sections: [{ content: dump.clean_transcript ?? dump.raw_transcript ?? '' }] }
}

/** Render a dump as Markdown. */
export function dumpToMarkdown(dump: Dump): string {
  const { title, sections } = dumpBody(dump)
  const lines: string[] = [`# ${title}`, '']
  if (dump.tags.length > 0) lines.push(dump.tags.map((t) => `\`${t}\``).join(' '), '')
  for (const section of sections) {
    if (section.label) lines.push(`## ${section.label}`, '')
    lines.push(section.content.trim(), '')
  }
  return lines.join('\n').trim() + '\n'
}

/** Render a dump as plain text. */
export function dumpToPlainText(dump: Dump): string {
  const { title, sections } = dumpBody(dump)
  const lines: string[] = [title, '']
  for (const section of sections) {
    if (section.label) lines.push(section.label.toUpperCase())
    lines.push(section.content.trim(), '')
  }
  return lines.join('\n').trim() + '\n'
}

/** A filesystem-safe slug for the export filename. */
export function dumpFilename(dump: Dump, ext: string): string {
  const base = (dump.title ?? 'idea')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return `${base || 'idea'}.${ext}`
}

/** Trigger a client-side download of text content. */
export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
