import type { Recording } from '@/hooks/useRecorder'
import type { CreateUploadResponse } from '@/types/api'

/**
 * Browser-side orchestration of the record → dump pipeline. Calls our own API
 * routes (never third parties directly): request a presigned R2 URL, upload the
 * audio, then trigger transcription and AI processing. Returns the dump id.
 */
async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = (await res.json().catch(() => null)) as {
    data?: T
    error?: { message?: string }
  } | null
  if (!res.ok || !json?.data) {
    throw new Error(json?.error?.message ?? 'Request failed')
  }
  return json.data
}

export async function uploadRecording(recording: Recording): Promise<string> {
  const { uploadUrl, dumpId } = await postJson<CreateUploadResponse>('/api/v1/upload', {
    duration_seconds: recording.durationSeconds,
    content_type: recording.mimeType,
  })

  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': recording.mimeType },
    body: recording.blob,
  })
  if (!put.ok) throw new Error('Audio upload failed')

  await postJson('/api/v1/transcribe', { dumpId })
  await postJson('/api/v1/process', { dumpId })
  return dumpId
}
