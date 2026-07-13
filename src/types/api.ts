/**
 * Shared API request/response shapes. Every endpoint returns either a success
 * payload or the consistent error envelope below — never a stack trace.
 */
import type { Dump } from './dump'

/** The only error shape ever sent to the client. */
export interface ApiError {
  error: {
    code: string
    message: string
  }
}

/** Discriminated result wrapper for typed client-side handling. */
export type ApiResult<T> = { data: T } | ApiError

// --- /api/v1/dumps ---

/** POST /api/v1/dumps body. */
export interface CreateDumpRequest {
  duration_seconds: number
}

/** PATCH /api/v1/dumps/[id] body. All fields optional. */
export interface UpdateDumpRequest {
  title?: string
  tags?: string[]
  is_pinned?: boolean
}

export type DumpResponse = Dump
export type DumpListResponse = Dump[]

// --- /api/v1/upload ---

/** POST /api/v1/upload body. */
export interface CreateUploadRequest {
  duration_seconds: number
  content_type: string
  size_bytes: number
}

/** Presigned upload target returned to the client. */
export interface CreateUploadResponse {
  uploadUrl: string
  key: string
  dumpId: string
}

// --- /api/v1/transcribe & /api/v1/process ---

export interface DumpIdRequest {
  dumpId: string
}
