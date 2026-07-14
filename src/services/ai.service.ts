import type { SupabaseClient } from '@supabase/supabase-js'
import type Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { Dump } from '@/types/dump'
import { claude, CLAUDE_MODEL } from '@/lib/claude'
import { getDumpById, updateDump } from '@/repositories/dumps.repository'
import { createReminderForDump } from '@/services/reminders.service'
import { extractJson } from '@/utils/json'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'

/**
 * Turn a raw transcript into a clean, titled, topic-segmented dump using Claude.
 * Leaves the dump in `ready`. Falls back to the raw transcript if the model
 * output can't be parsed, so a dump is never stuck.
 */

const SYSTEM_PROMPT = `You clean up and organize spoken voice notes from someone thinking out loud.
Given a raw transcript, you:
1. Fix punctuation, remove filler words and false starts, and keep the speaker's own voice and meaning. Do not add ideas that aren't there.
2. Split the content into topic segments, each with a short label (2-4 words) and the cleaned content for that topic.
3. Write a concise title (max 8 words).
4. Choose 3-5 tags that make this note easy to find and group later.
5. Detect whether the speaker is asking to be reminded about this later (phrases like "remind me...", "don't let me forget...", "ping me about this..."). If so, resolve the requested time into an absolute UTC instant:
   - You are given the recording's UTC timestamp and the speaker's local IANA timezone.
   - Prefer an explicit time if one is stated (e.g. "at 3pm", "at 9"). Otherwise resolve vague times of day in the speaker's LOCAL time: morning=09:00, afternoon=14:00, evening=18:00, tonight=20:00, end of day=17:00.
   - "Tomorrow" means the day after the recording's local date. A bare day-of-week means the next occurrence of that day.
   - If a stated or resolved local time has already passed today (relative to the recording's local time), use the next occurrence (tomorrow) instead of today.
   - Convert the resolved local date/time to UTC and output it as an ISO-8601 string ending in "Z".
   - The reminder message is a short, self-contained restatement of what to remind them about (max ~15 words) — not a copy of the transcript.
   - If no reminder is requested, set has_reminder to false and leave remind_at and message null.

Tagging rules — tags are for retrieval, so make them high-signal and reusable:
- Cover different facets: the DOMAIN/topic (e.g. "fintech", "marketing", "onboarding"), the TYPE of note (e.g. "feature-idea", "bug", "hiring", "research", "decision"), and any concrete ENTITY named (a product, tool, company, or person the note is about).
- Normalize: lowercase; singular; hyphenate multi-word tags ("go-to-market", not "go to market"); prefer widely-reusable terms over hyper-specific phrases so related notes share tags.
- Avoid empty filler ("idea", "note", "thought", "misc", "general", "stuff") and do not just restate the title.
- Only tag what the note is genuinely about. Fewer precise tags beat many vague ones — omit a facet rather than invent one.

Respond with ONLY a JSON object, no markdown, in exactly this shape:
{"title": string, "summary": string, "clean_transcript": string, "segments": [{"label": string, "content": string}], "tags": [string], "reminder": {"has_reminder": boolean, "remind_at": string|null, "message": string|null}}

The "summary" is a single plain sentence (max 25 words) capturing the gist, shown in a list. Write it neutrally and topic-first — lead with the idea itself. Do NOT refer to the speaker or name any role (no "the founder", "the user", "the speaker", "they", "I", "you"); describe the substance, not who said it.`

const aiOutputSchema = z.object({
  title: z.string().trim().min(1).max(150),
  summary: z.string().trim().min(1).max(300),
  clean_transcript: z.string().trim().min(1),
  segments: z
    .array(z.object({ label: z.string().trim().min(1), content: z.string().trim().min(1) }))
    .default([]),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  reminder: z
    .object({
      has_reminder: z.boolean(),
      remind_at: z.string().datetime().nullable(),
      message: z.string().trim().min(1).max(200).nullable(),
    })
    .nullable()
    .default(null),
})

/** A detected, validated reminder ready to be scheduled. */
interface ParsedReminder {
  remindAt: string
  message: string
}

/**
 * Validate the model's reminder guess: it must be a well-formed instant at
 * least a minute in the future. Anything else is treated as noise rather than
 * a real request — never schedule a push from a malformed or past timestamp.
 */
function validateReminder(
  reminder: z.infer<typeof aiOutputSchema>['reminder'],
): ParsedReminder | null {
  if (!reminder?.has_reminder || !reminder.remind_at || !reminder.message) return null
  const remindAtDate = new Date(reminder.remind_at)
  if (Number.isNaN(remindAtDate.getTime()) || remindAtDate.getTime() < Date.now() + 60_000) {
    return null
  }
  return { remindAt: remindAtDate.toISOString(), message: reminder.message }
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
      messages: [
        {
          role: 'user',
          content: `Recorded at: ${dump.created_at} (UTC). Speaker's local timezone: ${dump.timezone ?? 'UTC'}.\n\nRaw transcript:\n\n${raw}`,
        },
      ],
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

  const updated = await updateDump(supabase, userId, dumpId, {
    title: parsed.data.title,
    summary: parsed.data.summary,
    clean_transcript: parsed.data.clean_transcript,
    segments: parsed.data.segments,
    tags: parsed.data.tags,
    status: 'ready',
  })

  const reminder = validateReminder(parsed.data.reminder)
  if (reminder) {
    // A scheduling hiccup must never strand the dump itself — log and move on.
    try {
      await createReminderForDump(supabase, userId, dumpId, reminder)
    } catch {
      logger.error({ code: 'REMINDER_SCHEDULE_FAILED', userId, dumpId }, 'Could not schedule reminder')
    }
  }

  return updated
}
