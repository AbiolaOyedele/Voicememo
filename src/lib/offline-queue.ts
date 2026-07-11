import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Recording } from '@/hooks/useRecorder'

/**
 * IndexedDB-backed queue for recordings captured while offline. Blobs are stored
 * directly; the queue is flushed through the normal upload pipeline once the
 * connection returns (see useOfflineSync).
 */
export interface QueuedRecording extends Recording {
  id: string
  createdAt: number
}

interface QueueDB extends DBSchema {
  recordings: { key: string; value: QueuedRecording }
}

const DB_NAME = 'idea-dump'
const STORE = 'recordings'

let dbPromise: Promise<IDBPDatabase<QueueDB>> | null = null

function getDb(): Promise<IDBPDatabase<QueueDB>> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available in this environment.'))
  }
  if (!dbPromise) {
    dbPromise = openDB<QueueDB>(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

/** Add a recording to the offline queue. */
export async function enqueueRecording(recording: Recording): Promise<QueuedRecording> {
  const item: QueuedRecording = { ...recording, id: crypto.randomUUID(), createdAt: Date.now() }
  const db = await getDb()
  await db.put(STORE, item)
  return item
}

/** All queued recordings, oldest first. */
export async function getQueuedRecordings(): Promise<QueuedRecording[]> {
  const db = await getDb()
  const all = await db.getAll(STORE)
  return all.sort((a, b) => a.createdAt - b.createdAt)
}

/** Remove a recording from the queue once it has synced. */
export async function removeQueuedRecording(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE, id)
}

/** Number of recordings still waiting to sync. */
export async function queuedCount(): Promise<number> {
  const db = await getDb()
  return db.count(STORE)
}
