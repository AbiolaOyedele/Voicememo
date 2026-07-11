import type { SupabaseClient } from '@supabase/supabase-js'
import type Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { Dump } from '@/types/dump'
import { claude, CLAUDE_MODEL } from '@/lib/claude'
import { getDumpById, updateDump } from '@/repositories/dumps.repository'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'

/**
 * Turn a raw transcript into a clean, titled, topic-segmented dump using Claude.
 * Leaves the dump in `ready`. Falls back to the raw transcript if the model
 * output can't be parsed, so a dump is never stuck.
 */

const SYSTEM_PROMPT = `You clean up and organize spoken voice notes from a founder thinking out loud.
Given a raw transcript, you:
1. Fix punctuation, remove filler words and false starts, and keep the speaker's own voice and meaning. Do not add ideas that aren't there.
2. Split the content into topic segments, each with a short label (2-4 words) and the cleaned content for that topic.
3. Write a concise title (max 8 words).
4. Suggest up to 5 short lowercase tags.

Respond with ONLY a JSON object, no markdown, in exactly this shape:
{"title": string, "clean_transcript": string, "segments": [{"label": string, "content": string}], "tags": [string]}`

const aiOutputSchema = z.object({
  title: z.string().trim().min(1).max(150),
  clean_transcript: z.string().trim().min(1),
  segments: z
    .array(z.object({ label: z.string().trim().min(1), content: z.string().trim().min(1) }))
    .default([]),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
})

/** Extract the first balanced JSON object from a model response. */
function extractJson(text: string): unknown {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}

export async function processDump(
  supabase: SupabaseClient,
  userId: string,
  dumpId: string,
): Promise<Dump> {
  const dump = await getDumpById(supabase, userId, dumpId)
  if (!dump) {
    throw new AppError(404, 'That idea could not be found.', 'DUMP_NOT_FOUND')
  }
  const raw = dump.raw_transcript?.trim()
  if (!raw) {
    throw new AppError(422, 'There is nothing to process yet.', 'PROCESS_NO_TRANSCRIPT')
  }

  let responseText: string
  try {
    const message = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Raw transcript:\n\n${raw}` }],
    })
    responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
    logger.info({ code: 'PROCESS_OK', userId, dumpId }, 'AI processing complete')
  } catch (error) {
    await updateDump(supabase, userId, dumpId, { status: 'failed' })
    logger.error({ code: 'PROCESS_CLAUDE_FAILED', userId, dumpId }, 'Claude call failed')
    throw new AppError(502, 'We could not process your recording.', 'PROCESS_FAILED', error)
  }

  const parsed = aiOutputSchema.safeParse(extractJson(responseText))
  if (!parsed.success) {
    // Never strand a dump: fall back to the raw transcript as the clean copy.
    logger.warn({ code: 'PROCESS_PARSE_FALLBACK', userId, dumpId }, 'AI output unparseable')
    return updateDump(supabase, userId, dumpId, {
      clean_transcript: raw,
      status: 'ready',
    })
  }

  return updateDump(supabase, userId, dumpId, {
    title: parsed.data.title,
    clean_transcript: parsed.data.clean_transcript,
    segments: parsed.data.segments,
    tags: parsed.data.tags,
    status: 'ready',
  })
}
