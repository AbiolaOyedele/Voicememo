import { createClient, type DeepgramClient } from '@deepgram/sdk'
import { env } from '@/config/env.server'

/** Deepgram client (Nova-3 transcription). Server-only. */
export const deepgram: DeepgramClient = createClient(env.DEEPGRAM_API_KEY)
