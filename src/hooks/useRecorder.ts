'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MAX_DURATION_SECONDS } from '@/types/dump'
import { pickAudioMimeType } from '@/utils/audio'
import { acquireMic } from '@/lib/mic'

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'stopped' | 'error'

export interface Recording {
  blob: Blob
  mimeType: string
  durationSeconds: number
}

export interface UseRecorder {
  state: RecorderState
  elapsedSeconds: number
  error: string | null
  recording: Recording | null
  /** The live capture stream while recording (for audio visualisation). Null otherwise. */
  stream: MediaStream | null
  start: () => Promise<void>
  stop: () => void
  reset: () => void
}

/**
 * MediaRecorder wrapper. Handles mic permission, timing, a hard duration cap
 * (auto-stops), and produces a single audio Blob on stop. Cleans up the media
 * stream on stop and unmount. `maxDurationSeconds` defaults to the app-wide cap
 * but can be lowered (e.g. 5 minutes for guests).
 */
export function useRecorder(maxDurationSeconds: number = MAX_DURATION_SECONDS): UseRecorder {
  const [state, setState] = useState<RecorderState>('idle')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [recording, setRecording] = useState<Recording | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef<number>(0)
  const mimeRef = useRef<string>('')

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Detach from the shared mic stream WITHOUT stopping its tracks — the stream is
  // session-shared (see lib/mic) and reused across recordings to avoid re-prompts.
  const detachStream = useCallback(() => {
    streamRef.current = null
    setStream(null)
  }, [])

  const stop = useCallback(() => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
    clearTimer()
  }, [clearTimer])

  const start = useCallback(async () => {
    setError(null)
    setRecording(null)
    setElapsedSeconds(0)

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState('error')
      setError('Recording is not supported on this device or browser.')
      return
    }

    setState('requesting')
    let stream: MediaStream
    try {
      stream = await acquireMic()
    } catch {
      setState('error')
      setError('Microphone access was blocked. Enable it in your browser settings and try again.')
      return
    }

    const mimeType = pickAudioMimeType()
    let recorder: MediaRecorder
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
    } catch {
      setState('error')
      setError('We could not start recording on this browser.')
      return
    }

    streamRef.current = stream
    setStream(stream)
    recorderRef.current = recorder
    chunksRef.current = []
    mimeRef.current = recorder.mimeType || mimeType

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      const durationSeconds = Math.min(
        maxDurationSeconds,
        Math.round((Date.now() - startedAtRef.current) / 1000),
      )
      const type = mimeRef.current || 'audio/webm'
      const blob = new Blob(chunksRef.current, { type })
      detachStream()
      setRecording({ blob, mimeType: type, durationSeconds })
      setState('stopped')
    }

    startedAtRef.current = Date.now()
    recorder.start()
    setState('recording')

    clearTimer()
    timerRef.current = setInterval(() => {
      const secs = Math.round((Date.now() - startedAtRef.current) / 1000)
      setElapsedSeconds(secs)
      // Hard cap: auto-stop at the maximum duration.
      if (secs >= maxDurationSeconds) {
        stop()
      }
    }, 250)
  }, [clearTimer, stop, detachStream, maxDurationSeconds])

  const reset = useCallback(() => {
    clearTimer()
    detachStream()
    recorderRef.current = null
    chunksRef.current = []
    setElapsedSeconds(0)
    setError(null)
    setRecording(null)
    setState('idle')
  }, [clearTimer, detachStream])

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      clearTimer()
      detachStream()
    }
  }, [clearTimer, detachStream])

  return { state, elapsedSeconds, error, recording, stream, start, stop, reset }
}
