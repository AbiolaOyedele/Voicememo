'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { RecordButton } from '@/components/features/record/RecordButton'
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
  const { state, elapsedSeconds, error, recording, start, stop, reset } = useRecorder()
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  // Object URL for playing back the captured recording.
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
      // Offline: persist to the IndexedDB queue; it syncs when back online.
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

  const showStopped = state === 'stopped' && recording

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10">
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          {state === 'recording' ? 'Recording' : 'Idea Dump'}
        </h1>
        <p className="text-muted mt-1 text-sm">
          {state === 'recording'
            ? 'Say whatever is on your mind.'
            : showStopped
              ? 'Save it, or record again.'
              : 'Tap to speak your idea freely.'}
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
            <RecordButton state={state} onStart={start} onStop={stop} />
            {state === 'recording' ? (
              <Timer elapsedSeconds={elapsedSeconds} />
            ) : state === 'requesting' ? (
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
