'use client'

import { useEffect } from 'react'
import { isGuest, listGuestDumps, deleteGuestDump } from '@/lib/guest'
import { uploadRecording } from '@/lib/upload-client'

// Module-level guard so the migration runs at most once per page session even if
// the shell remounts.
let migrationRan = false

/**
 * When a former guest signs in, their locally-stored notes are uploaded to the
 * account (transcribed + processed like any recording) and then removed from the
 * device. Runs once per session inside the signed-in shell. A note that fails to
 * upload is left in local storage to retry on the next load — never dropped.
 *
 * Only fires for a real session: on a main route with no guest cookie, the
 * middleware guarantees the user is authenticated.
 */
export function useGuestMigration(): void {
  useEffect(() => {
    if (migrationRan) return
    if (isGuest()) return
    migrationRan = true

    let cancelled = false
    void (async () => {
      const dumps = await listGuestDumps().catch(() => [])
      if (cancelled || dumps.length === 0) return

      for (const dump of dumps) {
        if (cancelled) return
        try {
          await uploadRecording(
            {
              blob: dump.blob,
              mimeType: dump.mimeType,
              durationSeconds: dump.durationSeconds,
            },
            undefined,
            // Delete the local copy the moment the audio is stored server-side
            // — not after the whole pipeline. If transcription/processing is
            // interrupted here (page unload, one failed request), the library's
            // recovery sweep resumes it server-side; deleting late would make
            // the next session re-upload the same audio as a duplicate idea.
            () => void deleteGuestDump(dump.id),
          )
        } catch {
          // If the audio never made it up, the note is still in local storage
          // and retries next session. If it did, the recovery sweep takes over.
        }
      }

      if (!cancelled) window.dispatchEvent(new Event('dumpty:dumps-updated'))
    })()

    return () => {
      cancelled = true
    }
  }, [])
}
