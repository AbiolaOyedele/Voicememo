import type { SupabaseClient } from '@supabase/supabase-js'
import type Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { ActionPlan, Dump } from '@/types/dump'
import { claude, CLAUDE_MODEL } from '@/lib/claude'
import { getDumpById, updateDump } from '@/repositories/dumps.repository'
import { extractJson } from '@/utils/json'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'

/**
 * Generate (or regenerate) the action-plan checklist for a dump, from its
 * already-cleaned transcript. This runs only when the user explicitly asks to
 * see a plan — it is not part of the initial transcript-processing pipeline —
 * so most dumps never pay for this call, and no transcript is ever re-sent to
 * Claude for the initial cleanup pass.
 */

const SYSTEM_PROMPT = `You turn a founder's voice-note idea into a short, concrete action plan.
Given the idea's cleaned-up text, produce a checklist of the next concrete steps someone would actually take to move it forward — not a restatement of the idea itself.

Rules:
1. Each item is one concrete, actionable step, written as an imperative ("Sketch the onboarding flow", not "Onboarding flow").
2. 3 to 8 items. Prefer fewer, higher-value steps over padding the list.
3. Order items in the sequence they would realistically be done.

Respond with ONLY a JSON object, no markdown, in exactly this shape:
{"items": [string]}`

const actionPlanOutputSchema = z.object({
  items: z.array(z.string().trim().min(1).max(280)).min(1).max(12),
})

/** Turn model output into a stored ActionPlan, generating stable item ids. */
function toActionPlan(dumpId: string, items: string[]): ActionPlan {
  return {
    items: items.map((text, i) => ({ id: `${dumpId}-${i}`, text, done: false })),
    generated_at: new Date().toISOString(),
  }
}

export async function generateActionPlan(
  supabase: SupabaseClient,
  userId: string,
  dumpId: string,
): Promise<Dump> {
  const dump = await getDumpById(supabase, userId, dumpId)
  if (!dump) {
    throw new AppError(404, 'That idea could not be found.', 'DUMP_NOT_FOUND')
  }
  const text = (dump.clean_transcript ?? dump.raw_transcript)?.trim()
  if (!text || dump.status !== 'ready') {
    throw new AppError(
      422,
      'This idea is not ready for an action plan yet.',
      'ACTION_PLAN_NOT_READY',
    )
  }

  let responseText: string
  try {
    const message = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: text }],
    })
    responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
  } catch (error) {
    logger.error({ code: 'ACTION_PLAN_CLAUDE_FAILED', userId, dumpId }, 'Claude call failed')
    throw new AppError(502, 'We could not create an action plan.', 'ACTION_PLAN_FAILED', error)
  }

  const parsed = actionPlanOutputSchema.safeParse(extractJson(responseText))
  if (!parsed.success) {
    logger.warn({ code: 'ACTION_PLAN_PARSE_FAILED', userId, dumpId }, 'AI output unparseable')
    throw new AppError(
      502,
      'We could not create an action plan. Try again.',
      'ACTION_PLAN_PARSE_FAILED',
    )
  }

  return updateDump(supabase, userId, dumpId, {
    action_plan: toActionPlan(dumpId, parsed.data.items),
  })
}
