import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Recording } from '@/hooks/useRecorder'

/**
 * Guest mode: lets someone try Dumpty without an account. Guest recordings never
 * touch the server — they are capped at 5 minutes, stored locally in the browser
 * (IndexedDB), and played back locally. Server-side transcription/cleanup is a
 * signed-in feature, so guest notes are audio-only.
 */

/** Cookie the middleware reads to grant a guest access to the main app. */
export const GUEST_COOKIE = 'dumpty_guest'

/** Guest recordings are capped shorter than signed-in ones. */
export const GUEST_MAX_DURATION_SECONDS = 300 // 5 minutes

/** A locally-stored guest recording. */
export interface GuestDump {
  id: string
  title: string
  createdAt: number
  durationSeconds: number
  mimeType: string
  blob: Blob
}

/** True when the current browser is in guest mode (client-only). */
export function isGuest(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split('; ').some((c) => c.startsWith(`${GUEST_COOKIE}=1`))
}

/** Turn on guest mode: sets a 30-day cookie so the middleware lets the app load. */
export function enableGuest(): void {
  if (typeof document === 'undefined') return
  const maxAge = 60 * 60 * 24 * 30
  document.cookie = `${GUEST_COOKIE}=1; path=/; max-age=${maxAge}; samesite=lax`
}

/** Turn off guest mode (e.g. when signing up for a real account). */
export function disableGuest(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${GUEST_COOKIE}=; path=/; max-age=0; samesite=lax`
}

// --- Local store -----------------------------------------------------------

interface GuestDB extends DBSchema {
  dumps: { key: string; value: GuestDump }
}

const DB_NAME = 'dumpty-guest'
const STORE = 'dumps'

let dbPromise: Promise<IDBPDatabase<GuestDB>> | null = null

function getDb(): Promise<IDBPDatabase<GuestDB>> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('Local storage is not available in this browser.'))
  }
  if (!dbPromise) {
    dbPromise = openDB<GuestDB>(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

/** Save a guest recording to the browser. Returns the stored note. */
export async function saveGuestDump(recording: Recording): Promise<GuestDump> {
  const now = new Date()
  const item: GuestDump = {
    id: crypto.randomUUID(),
    title: `Voice note · ${now.toLocaleDateString()} ${now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`,
    createdAt: now.getTime(),
    durationSeconds: recording.durationSeconds,
    mimeType: recording.mimeType,
    blob: recording.blob,
  }
  const db = await getDb()
  await db.put(STORE, item)
  return item
}

/** All guest recordings, newest first. */
export async function listGuestDumps(): Promise<GuestDump[]> {
  const db = await getDb()
  const all = await db.getAll(STORE)
  return all.sort((a, b) => b.createdAt - a.createdAt)
}

/** Delete a guest recording. */
export async function deleteGuestDump(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE, id)
}
