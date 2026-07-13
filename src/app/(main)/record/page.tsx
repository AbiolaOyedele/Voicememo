'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { VoicePoweredOrb } from '@/components/ui/voice-powered-orb'
import { Logo } from '@/components/ui/Logo'
import { Timer } from '@/components/features/record/Timer'
import { QueuedIndicator } from '@/components/features/record/QueuedIndicator'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useRefreshDisabled } from '@/hooks/useRefreshControl'
import { useTabNav } from '@/hooks/useTabCarousel'
import { Portal } from '@/components/ui/Portal'
import {
  ProgressiveFluxLoader,
  type ProgressiveFluxPhase,
} from '@/components/ui/progressive-flux-loader'
import { useRecorder } from '@/hooks/useRecorder'
import { uploadRecording } from '@/lib/upload-client'
import { enqueueRecording } from '@/lib/offline-queue'
import { MAX_DURATION_SECONDS } from '@/types/dump'
import { isGuest, saveGuestDump, GUEST_MAX_DURATION_SECONDS } from '@/lib/guest'

type SaveState = 'idle' | 'saving' | 'queued' | 'error'

/** Phase labels for the transcription pipeline, keyed to upload-client progress. */
const PROCESSING_PHASES: ProgressiveFluxPhase[] = [
  { at: 0, label: 'Uploading' },
  { at: 40, label: 'Transcribing' },
  { at: 70, label: 'Cleaning up' },
  { at: 100, label: 'All done' },
]

// While a stage is in flight the reported value holds steady, so we creep toward
// the next stage's ceiling to keep the bar alive without ever faking completion.
const STAGE_CEILINGS = [38, 68, 98]

export default function RecordPage() {
  const goToTab = useTabNav()
  const [guest, setGuest] = useState(false)
  useEffect(() => setGuest(isGuest()), [])
  const maxDuration = guest ? GUEST_MAX_DURATION_SECONDS : MAX_DURATION_SECONDS
  const { state, elapsedSeconds, error, recording, stream, start, stop, reset } =
    useRecorder(maxDuration)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)

  // Gentle in-stage creep: nudge progress toward the current stage's ceiling
  // while we await the server, so the bar never sits frozen during a long step.
  useEffect(() => {
    if (!processing) return
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) return p
        const ceiling = STAGE_CEILINGS.find((c) => c > p)
        if (ceiling === undefined) return p
        return Math.min(ceiling, p + 0.4)
      })
    }, 120)
    return () => clearInterval(id)
  }, [processing])

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

    // Guests save locally only — no server upload or transcription.
    if (guest) {
      setSaveState('saving')
      try {
        await saveGuestDump(recording)
        reset()
        setSaveState('idle')
        // The library panel is already mounted in the swipe carousel, so
        // navigating to it won't remount/refetch — tell it to reload.
        window.dispatchEvent(new Event('dumpty:dumps-updated'))
        goToTab('/library')
      } catch {
        setSaveState('error')
        setSaveError('We could not save your note on this device. Please try again.')
      }
      return
    }

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
    setProgress(0)
    setProcessing(true)
    try {
      await uploadRecording(recording, (value) => {
        // Only ever move forward — never let a stage report undo the creep.
        setProgress((p) => Math.max(p, value))
      })
      setProgress(100)
      // Brief beat so "All done" is seen before we leave.
      await new Promise((r) => setTimeout(r, 650))
      reset()
      setProcessing(false)
      setSaveState('idle')
      // The library panel is already mounted in the swipe carousel, so
      // navigating to it won't remount/refetch — tell it to reload.
      window.dispatchEvent(new Event('dumpty:dumps-updated'))
      goToTab('/library')
    } catch {
      setProcessing(false)
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

  // A surprise reload mid-take (e.g. from a pending update) would destroy the
  // recording, so suppress pull-to-refresh while there's anything to lose.
  useRefreshDisabled(isRecording || Boolean(showStopped) || processing)

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10">
      <Portal>
        <AnimatePresence>
          {processing ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-canvas fixed inset-0 z-[90] flex flex-col items-center justify-center px-6"
              // Brand flame fill + glow.
              style={{ ['--flux-from' as string]: '#ff4f03', ['--flux-to' as string]: '#ff9a5c' }}
            >
              <ProgressiveFluxLoader value={progress} phases={PROCESSING_PHASES} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Portal>

      <header className="text-center">
        {isRecording ? (
          <h1 className="text-2xl tracking-tight">Recording</h1>
        ) : (
          <Logo as="h1" className="text-5xl" />
        )}
        <p className="text-muted mt-1 text-sm">
          {isRecording
            ? 'Say whatever is on your mind. Tap the orb when you are done.'
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
