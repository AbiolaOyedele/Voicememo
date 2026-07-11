'use client'

import { motion } from 'framer-motion'
import { MicIcon } from '@/components/ui/icons'
import type { RecorderState } from '@/hooks/useRecorder'

interface RecordButtonProps {
  state: RecorderState
  onStart: () => void
  onStop: () => void
  disabled?: boolean
}

/**
 * The central record control. Idle: black circle with a white mic. Recording:
 * a stop square with a pulsing ring so it is unmistakable that capture is live.
 */
export function RecordButton({ state, onStart, onStop, disabled }: RecordButtonProps) {
  const isRecording = state === 'recording'
  const isBusy = state === 'requesting'

  return (
    <div className="relative flex h-48 w-48 items-center justify-center">
      {isRecording ? (
        <motion.span
          aria-hidden
          className="bg-ink/10 absolute inset-0 rounded-full"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.1, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : null}

      <motion.button
        type="button"
        onClick={isRecording ? onStop : onStart}
        disabled={disabled || isBusy}
        whileTap={{ scale: 0.94 }}
        transition={{ duration: 0.15 }}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        aria-pressed={isRecording}
        className="bg-ink text-canvas relative flex h-40 w-40 items-center justify-center rounded-full shadow-sm transition-opacity disabled:opacity-60"
      >
        {isRecording ? <span className="bg-canvas h-12 w-12 rounded-lg" /> : <MicIcon size={56} />}
      </motion.button>
    </div>
  )
}
