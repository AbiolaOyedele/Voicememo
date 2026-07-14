import {
  GetObjectCommand,
  HeadObjectCommand,
  PutBucketLifecycleConfigurationCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { r2, R2_BUCKET } from '@/lib/r2'
import { extensionForMimeType } from '@/utils/audio'
import { AppError } from '@/lib/errors'
import { MAX_DURATION_SECONDS, MAX_UPLOAD_BYTES } from '@/types/dump'
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

/**
 * Presigned PUT URL the client uses to upload audio directly to R2. Binding
 * `ContentLength` to the exact declared size means R2 rejects a PUT whose body
 * doesn't match — the client already has the full recording blob (and thus its
 * exact byte length) by the time it requests this URL, so there's no reason a
 * legitimate upload would ever need to send a different size.
 */
export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  sizeBytes: number,
): Promise<string> {
  try {
    return await getSignedUrl(
      r2,
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        ContentType: contentType,
        ContentLength: sizeBytes,
      }),
      { expiresIn: UPLOAD_URL_TTL_SECONDS },
    )
  } catch (error) {
    throw new AppError(502, 'We could not prepare the upload.', 'STORAGE_PRESIGN_FAILED', error)
  }
}

/**
 * One-time infra setup: configure the R2 bucket to auto-delete audio objects 7
 * days after upload (audio is only needed long enough to transcribe). Run once
 * via an admin script/route with valid R2 credentials.
 */
export async function configureAudioLifecycle(): Promise<void> {
  await r2.send(
    new PutBucketLifecycleConfigurationCommand({
      Bucket: R2_BUCKET,
      LifecycleConfiguration: {
        Rules: [
          {
            ID: 'expire-audio-7d',
            Status: 'Enabled',
            Filter: { Prefix: 'audio/' },
            Expiration: { Days: 7 },
          },
        ],
      },
    }),
  )
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

/**
 * Actual stored size of an uploaded audio object, in bytes. A defense-in-depth
 * check independent of the presigned PUT's `ContentLength` binding — run
 * before handing an object to the paid transcription API, in case R2 doesn't
 * enforce that binding as strictly as S3 does.
 */
export async function getAudioObjectSize(key: string): Promise<number> {
  try {
    const head = await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }))
    return head.ContentLength ?? 0
  } catch (error) {
    throw new AppError(502, 'We could not read the audio.', 'STORAGE_HEAD_FAILED', error)
  }
}

const uploadSchema = z.object({
  // 15-minute hard cap enforced server-side before anything reaches R2/Deepgram.
  duration_seconds: z.number().int().min(1).max(MAX_DURATION_SECONDS),
  content_type: z
    .string()
    .regex(/^audio\//, 'Only audio uploads are allowed.')
    .max(100),
  // Exact byte length of the recording blob the client already has in hand —
  // bound into the presigned PUT URL so R2 rejects an upload of a different
  // size (see createPresignedUploadUrl).
  size_bytes: z.number().int().min(1).max(MAX_UPLOAD_BYTES),
  // IANA timezone from the browser, so a spoken reminder ("remind me this
  // evening") resolves against the zone the user was actually in.
  timezone: z.string().trim().min(1).max(100),
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

  const { duration_seconds, content_type, size_bytes, timezone } = parsed.data
  const dump = await insertDump(supabase, {
    userId,
    durationSeconds: duration_seconds,
    status: 'uploading',
    timezone,
  })

  const key = buildAudioKey(userId, dump.id, content_type)
  await updateDump(supabase, userId, dump.id, { r2_audio_key: key })
  const uploadUrl = await createPresignedUploadUrl(key, content_type, size_bytes)

  return { uploadUrl, key, dumpId: dump.id }
}
