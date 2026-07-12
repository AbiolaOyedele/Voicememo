'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { VoicePoweredOrb } from '@/components/ui/voice-powered-orb'
import { Timer } from '@/components/features/record/Timer'
import { QueuedIndicator } from '@/components/features/record/QueuedIndicator'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useRecorder } from '@/hooks/useRecorder'
import { uploadRecording } from '@/lib/upload-client'
import { enqueueRecording } from '@/lib/offline-queue'

type SaveState = 'idle' | 'saving' | 'queued' | 'error'

export default function RecordPage() {
  const router = useRouter()
  const { state, elapsedSeconds, error, recording, stream, start, stop, reset } = useRecorder()
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  const audioUrl = useMemo(
    () => (recording ? URL.createObjectURL(recording.blob) : null),
    [recording],
  )
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  async function handleSave(): Promise<void> {
    if (!recording) return
    setSaveError(null)

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        await enqueueRecording(recording)
        setSaveState('queued')
      } catch {
        setSaveState('error')
        setSaveError('We could not save your recording offline. Please try again.')
      }
      return
    }

    setSaveState('saving')
    try {
      await uploadRecording(recording)
      reset()
      setSaveState('idle')
      router.push('/library')
    } catch {
      setSaveState('error')
      setSaveError('We could not save your recording. Check your connection and try again.')
    }
  }

  function handleDiscard(): void {
    reset()
    setSaveState('idle')
    setSaveError(null)
  }

  const isRecording = state === 'recording'
  const isBusy = state === 'requesting'
  const showStopped = state === 'stopped' && recording

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10">
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          {isRecording ? 'Recording' : 'Idea Dump'}
        </h1>
        <p className="text-muted mt-1 text-sm">
          {isRecording
            ? 'Say whatever is on your mind.'
            : showStopped
              ? 'Save it, or record again.'
              : 'Tap the orb to speak your idea freely.'}
        </p>
      </header>

      <AnimatePresence mode="wait">
        {showStopped ? (
          <motion.div
            key="stopped"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex w-full max-w-xs flex-col items-center gap-5"
          >
            {audioUrl ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <audio controls src={audioUrl} className="w-full" />
            ) : null}

            {saveState === 'queued' ? (
              <QueuedIndicator>Queued — this will upload when you are back online.</QueuedIndicator>
            ) : null}

            {saveError ? (
              <p role="alert" className="text-muted text-center text-sm">
                {saveError}
              </p>
            ) : null}

            <div className="flex w-full flex-col gap-3">
              <Button onClick={handleSave} loading={saveState === 'saving'} fullWidth>
                {saveState === 'error' ? 'Try again' : 'Save idea'}
              </Button>
              <Button variant="ghost" onClick={handleDiscard} fullWidth>
                Discard
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="record"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-8"
          >
            <motion.button
              type="button"
              onClick={isRecording ? stop : start}
              disabled={isBusy}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.15 }}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              aria-pressed={isRecording}
              className="relative h-64 w-64 overflow-hidden rounded-full disabled:opacity-70"
            >
              <VoicePoweredOrb enableVoiceControl={isRecording} mediaStream={stream} />
              {isRecording ? (
                <span className="bg-ink pointer-events-none absolute top-1/2 left-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-md" />
              ) : null}
            </motion.button>

            {isRecording ? (
              <Timer elapsedSeconds={elapsedSeconds} />
            ) : isBusy ? (
              <p className="text-muted flex items-center gap-2 text-sm">
                <Spinner size={16} /> Waiting for microphone…
              </p>
            ) : null}

            {state === 'error' && error ? (
              <p role="alert" className="text-muted max-w-xs text-center text-sm">
                {error}
              </p>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
