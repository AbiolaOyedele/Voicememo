/**
 * Session-shared microphone stream.
 *
 * iOS Safari (especially as an installed PWA) re-prompts for mic permission on
 * every fresh `getUserMedia` call and whenever the previous stream's tracks were
 * stopped. To avoid prompting on every recording, we acquire the stream once and
 * reuse it across recordings and in-app navigations for the life of the page.
 * The stream is released on `pagehide` (tab/app closing), so the OS "recording"
 * indicator does not linger beyond the session.
 */

let cached: MediaStream | null = null
let listenerBound = false

function hasLiveAudio(stream: MediaStream | null): stream is MediaStream {
  return !!stream && stream.getAudioTracks().some((t) => t.readyState === 'live')
}

/** Get the shared mic stream, requesting permission only if we don't have a live one. */
export async function acquireMic(): Promise<MediaStream> {
  if (hasLiveAudio(cached)) return cached
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  cached = stream

  if (!listenerBound && typeof window !== 'undefined') {
    listenerBound = true
    // Release when the page is actually going away, not on client-side nav.
    window.addEventListener('pagehide', releaseMic)
  }
  return stream
}

/** Stop and drop the shared mic stream (also clears the OS recording indicator). */
export function releaseMic(): void {
  cached?.getTracks().forEach((t) => t.stop())
  cached = null
}
