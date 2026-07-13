'use client'

import { useEffect, useState } from 'react'
import { TextGenerateEffect } from '@/components/ui/text-generate-effect'
import { cn } from '@/lib/utils'

/**
 * Ambient "thoughts" that surface one at a time on the hero canvas — the kind of
 * half-formed ideas Dumpty is built to catch. Each thought fades in word by word
 * (a soft blur-to-focus, as if a thought forming), lingers, then fades out. A
 * short pause follows before the next one appears.
 *
 * Only ONE thought is ever visible, and it surfaces in a randomised edge slot
 * (top/bottom × left/centre/right) so it never crowds the centred taglines and
 * CTA. Text is centre-aligned, faint and `pointer-events-none`: background
 * texture, not content. It recedes with the canvas as the flame card rises.
 */

const THOUGHTS: readonly string[] = [
  "I'm thinking of building an app that combines fitness and culture, something simple that could get older people up and moving again.",
  'There’s a pasta recipe idea stuck in my head, spicy chili oil twist, nothing complicated, just something worth trying this weekend.',
  'Had a shower thought about a plant subscription box, for people who keep killing their plants but still want the greenery around.',
  'I keep coming back to this short story idea, a kid finds a radio that only plays conversations from the future.',
  'Wondering what it’d look like to mix streetwear with traditional prints, could be a whole clothing line idea honestly.',
  'There’s an idea for a podcast that interviews people about the jobs they quit, might actually be worth pitching to someone.',
  'I’ve been sketching out a board game concept in my head, something strategy based but easy enough for kids to jump into.',
  'What if there was an app that matched people up for random skill swaps, like teach me guitar, I’ll teach you Excel.',
  'Thinking about a looser, more abstract painting style, something that breaks away from always going for realism.',
  'There’s a business idea about renting out event decor instead of buying, could actually save people a lot of money.',
]

/** Edge slots kept clear of the centred taglines/CTA. */
const SLOTS: readonly string[] = [
  'top-[8%] left-1/2 -translate-x-1/2',
  'top-[9%] left-[5%]',
  'top-[9%] right-[5%]',
  'bottom-[10%] left-1/2 -translate-x-1/2',
  'bottom-[11%] left-[5%]',
  'bottom-[11%] right-[5%]',
]

const REVEAL_DURATION_MS = 800 // matches TextGenerateEffect `duration`
const STAGGER_MS = 200 // matches TextGenerateEffect `stagger(0.2)`
const HOLD_MS = 2600 // dwell once fully revealed
const FADE_MS = 900 // fade the thought out
const GAP_MS = 2000 // blank pause before the next thought
const PEAK_OPACITY = 0.32

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function ThoughtStream({ className }: { className?: string }) {
  const [index, setIndex] = useState(0)
  const [slot, setSlot] = useState(0)
  const [shown, setShown] = useState(true)

  useEffect(() => {
    const text = THOUGHTS[index % THOUGHTS.length]
    const wordCount = text.split(' ').length
    const revealMs = wordCount * STAGGER_MS + REVEAL_DURATION_MS

    let advance: ReturnType<typeof setTimeout>
    const hide = setTimeout(() => {
      setShown(false)
      advance = setTimeout(() => {
        // Pick a fresh slot (never the same one twice in a row).
        setSlot((prev) => {
          const next = Math.floor(Math.random() * (SLOTS.length - 1))
          return next >= prev ? next + 1 : next
        })
        setIndex((v) => v + 1)
        setShown(true)
      }, FADE_MS + GAP_MS)
    }, revealMs + HOLD_MS)

    return () => {
      clearTimeout(hide)
      clearTimeout(advance)
    }
  }, [index])

  const reduced = prefersReducedMotion()

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <div
        className={cn('absolute w-[min(90vw,420px)] px-4 text-center', SLOTS[slot])}
        style={{
          opacity: shown ? PEAK_OPACITY : 0,
          transition: `opacity ${FADE_MS}ms ease`,
        }}
      >
        <TextGenerateEffect
          key={index}
          words={THOUGHTS[index % THOUGHTS.length]}
          filter={!reduced}
          duration={reduced ? 0 : 0.8}
          className="text-ink text-[clamp(0.9rem,2.4vw,1.2rem)] font-light italic leading-snug tracking-tight"
        />
      </div>
    </div>
  )
}
