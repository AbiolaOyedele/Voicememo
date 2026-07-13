import type { Dump } from '@/types/dump'

/**
 * On-device cache of the user's dumps (localStorage). The list endpoint returns
 * full rows — transcripts, segments, tags, action plan — so a cached entry can
 * render the detail page completely with no network round-trip. This is what
 * makes an idea open instantly when tapped or swiped to, instead of showing a
 * skeleton while it fetches. Treated as a fast, possibly-stale first paint that
 * the page revalidates in the background.
 */
const KEY = 'dumpty:dumps:v1'

/** Reads the cached dump list. Returns [] on miss, parse error, or SSR. */
export function readDumpsCache(): Dump[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as Dump[]) : []
  } catch {
    return []
  }
}

/** Replaces the cached dump list. Silently no-ops if storage is unavailable. */
export function writeDumpsCache(dumps: Dump[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(dumps))
  } catch {
    // Quota or private-mode failure — cache is best-effort, never fatal.
  }
}

/** Returns a single cached dump by id, or null if not cached. */
export function readCachedDump(id: string): Dump | null {
  return readDumpsCache().find((d) => d.id === id) ?? null
}

/** Merges one updated dump into the cached list (insert or replace). */
export function upsertCachedDump(dump: Dump): void {
  const list = readDumpsCache()
  const idx = list.findIndex((d) => d.id === dump.id)
  if (idx === -1) list.unshift(dump)
  else list[idx] = dump
  writeDumpsCache(list)
}

/** Removes a dump from the cache (after a delete). */
export function removeCachedDump(id: string): void {
  writeDumpsCache(readDumpsCache().filter((d) => d.id !== id))
}
