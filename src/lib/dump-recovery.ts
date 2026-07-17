import type { Dump } from '@/types/dump'

/**
 * Client-side recovery for dumps stranded mid-pipeline. The record pipeline
 * (upload → transcribe → process) is driven from the browser, so a page unload
 * or one failed request — most common right after sign-in, when guest notes
 * migrate in the background — leaves a dump stuck in a non-terminal status
 * showing "Processing your idea…" forever. Both API steps are safe to re-run:
 * /transcribe re-reads the stored audio (and marks the dump failed if the
 * audio never arrived), /process re-runs cleanup on the raw transcript.
 */

/** Don't touch dumps younger than this — their pipeline is likely in flight. */
const STUCK_AFTER_MS = 90_000

/** One resume attempt per dump per page session, so a hard failure can't loop. */
const attempted = new Set<string>()

const RESUMABLE: readonly Dump['status'][] = ['uploading', 'transcribing', 'processing']

async function post(path: string, dumpId: string): Promise<boolean> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ dumpId }),
  })
  return res.ok
}

/**
 * Resume every stuck dump in the list. Returns true when any dump's status may
 * have changed (resumed or failed), so the caller knows to refetch.
 */
export async function resumeStuckDumps(dumps: Dump[]): Promise<boolean> {
  const stuck = dumps.filter(
    (d) =>
      RESUMABLE.includes(d.status) &&
      !attempted.has(d.id) &&
      Date.now() - new Date(d.updated_at).getTime() > STUCK_AFTER_MS,
  )

  let changed = false
  for (const dump of stuck) {
    attempted.add(dump.id)
    changed = true
    try {
      if (dump.status !== 'processing') {
        // Re-transcribe; if the audio never made it to storage the server
        // marks the dump failed, which is the honest terminal state.
        const ok = await post('/api/v1/transcribe', dump.id)
        if (!ok) continue
      }
      await post('/api/v1/process', dump.id)
    } catch {
      // Network hiccup — the next library load gets a fresh session's attempt.
      attempted.delete(dump.id)
    }
  }
  return changed
}
