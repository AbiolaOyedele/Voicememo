import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { r2, R2_BUCKET } from '@/lib/r2'
import { extensionForMimeType } from '@/utils/audio'
import { AppError } from '@/lib/errors'
import { MAX_DURATION_SECONDS } from '@/types/dump'
import { insertDump, updateDump } from '@/repositories/dumps.repository'
import type { CreateUploadResponse } from '@/types/api'

/**
 * R2 storage business logic: build object keys and issue short-lived presigned
 * URLs. Audio objects auto-delete after 7 days via the bucket lifecycle rule.
 */

const UPLOAD_URL_TTL_SECONDS = 600 // 10 minutes
const DOWNLOAD_URL_TTL_SECONDS = 600

/** Deterministic key for a dump's audio, namespaced by user. */
export function buildAudioKey(userId: string, dumpId: string, mimeType: string): string {
  return `audio/${userId}/${dumpId}.${extensionForMimeType(mimeType)}`
}

/** Presigned PUT URL the client uses to upload audio directly to R2. */
export async function createPresignedUploadUrl(key: string, contentType: string): Promise<string> {
  try {
    return await getSignedUrl(
      r2,
      new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType }),
      { expiresIn: UPLOAD_URL_TTL_SECONDS },
    )
  } catch (error) {
    throw new AppError(502, 'We could not prepare the upload.', 'STORAGE_PRESIGN_FAILED', error)
  }
}

/** Presigned GET URL used server-side to hand the audio to Deepgram. */
export async function createPresignedDownloadUrl(key: string): Promise<string> {
  try {
    return await getSignedUrl(r2, new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }), {
      expiresIn: DOWNLOAD_URL_TTL_SECONDS,
    })
  } catch (error) {
    throw new AppError(502, 'We could not read the audio.', 'STORAGE_PRESIGN_FAILED', error)
  }
}

const uploadSchema = z.object({
  // 15-minute hard cap enforced server-side before anything reaches R2/Deepgram.
  duration_seconds: z.number().int().min(1).max(MAX_DURATION_SECONDS),
  content_type: z
    .string()
    .regex(/^audio\//, 'Only audio uploads are allowed.')
    .max(100),
})

/**
 * Prepare an audio upload: create the dump row (status `uploading`), reserve its
 * R2 key, and return a presigned PUT URL for the client. Rejects recordings over
 * the 15-minute cap before they can reach any paid third-party API.
 */
export async function prepareUpload(
  supabase: SupabaseClient,
  userId: string,
  input: unknown,
): Promise<CreateUploadResponse> {
  const parsed = uploadSchema.safeParse(input)
  if (!parsed.success) {
    throw new AppError(
      422,
      'That recording could not be accepted.',
      'UPLOAD_INVALID',
      parsed.error.flatten(),
    )
  }

  const { duration_seconds, content_type } = parsed.data
  const dump = await insertDump(supabase, {
    userId,
    durationSeconds: duration_seconds,
    status: 'uploading',
  })

  const key = buildAudioKey(userId, dump.id, content_type)
  await updateDump(supabase, userId, dump.id, { r2_audio_key: key })
  const uploadUrl = await createPresignedUploadUrl(key, content_type)

  return { uploadUrl, key, dumpId: dump.id }
}
