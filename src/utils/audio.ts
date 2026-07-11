/** Audio format + duration helpers (pure, no side effects). */

/** Candidate recording MIME types in preference order. */
const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
] as const

/**
 * Pick the best MediaRecorder MIME type the current browser supports.
 * Returns an empty string when MediaRecorder is unavailable (SSR / unsupported).
 */
export function pickAudioMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  for (const type of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

/** File extension for a recorded MIME type (defaults to webm). */
export function extensionForMimeType(mime: string): string {
  if (mime.includes('mp4')) return 'm4a'
  if (mime.includes('ogg')) return 'ogg'
  return 'webm'
}

/** Format a duration in seconds as m:ss (or h:mm:ss beyond an hour). */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const hrs = Math.floor(s / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60
  const mm = hrs > 0 ? String(mins).padStart(2, '0') : String(mins)
  const ss = String(secs).padStart(2, '0')
  return hrs > 0 ? `${hrs}:${mm}:${ss}` : `${mm}:${ss}`
}
