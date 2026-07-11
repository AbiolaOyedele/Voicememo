import Anthropic from '@anthropic-ai/sdk'
import { env } from '@/config/env.server'

/** Anthropic (Claude) client for transcript cleanup + segmentation. Server-only. */
export const claude = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

/** Model used for cleanup + topic segmentation. */
export const CLAUDE_MODEL = 'claude-sonnet-5'
