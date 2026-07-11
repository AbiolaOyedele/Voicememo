import type { SupabaseClient } from '@supabase/supabase-js'
import { deepgram } from '@/lib/deepgram'
import { createPresignedDownloadUrl } from '@/services/storage.service'
import { getDumpById, updateDump } from '@/repositories/dumps.repository'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'

/**
 * Transcribe a dump's audio with Deepgram Nova-3. Moves the dump through
 * `transcribing` and leaves it in `processing` with `raw_transcript` set.
 */
export async function transcribeDump(
  supabase: SupabaseClient,
  userId: string,
  dumpId: string,
): Promise<string> {
  const dump = await getDumpById(supabase, userId, dumpId)
  if (!dump) {
    throw new AppError(404, 'That idea could not be found.', 'DUMP_NOT_FOUND')
  }
  if (!dump.r2_audio_key) {
    throw new AppError(422, 'There is no audio to transcribe.', 'TRANSCRIBE_NO_AUDIO')
  }

  await updateDump(supabase, userId, dumpId, { status: 'transcribing' })

  const audioUrl = await createPresignedDownloadUrl(dump.r2_audio_key)
  const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
    { url: audioUrl },
    { model: 'nova-3', smart_format: true, punctuate: true },
  )

  if (error) {
    await updateDump(supabase, userId, dumpId, { status: 'failed' })
    logger.error({ code: 'TRANSCRIBE_DEEPGRAM_FAILED', userId, dumpId }, 'Deepgram failed')
    throw new AppError(502, 'We could not transcribe your recording.', 'TRANSCRIBE_FAILED', error)
  }

  const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? ''

  // Usage log for future cost monitoring (no transcript content).
  logger.info(
    { code: 'TRANSCRIBE_OK', userId, dumpId, durationSeconds: dump.duration_seconds },
    'Transcription complete',
  )

  await updateDump(supabase, userId, dumpId, {
    raw_transcript: transcript,
    status: 'processing',
  })
  return transcript
}
