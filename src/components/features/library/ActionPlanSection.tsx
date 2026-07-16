'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { ActionPlan, ActionPlanItem, Dump } from '@/types/dump'
import { Button } from '@/components/ui/Button'
import { ChevronDownIcon, PlusIcon, XIcon } from '@/components/ui/icons'

const MAX_ITEMS = 20
const MAX_ITEM_LENGTH = 280

/**
 * Action plan: generated on demand from the cleaned transcript (so most ideas
 * never pay for the extra Claude call), then worked like a real checklist —
 * animated checkboxes, a progress bar that survives collapse, add-your-own
 * steps, and per-item delete. Every edit PATCHes the whole plan back
 * (the API replaces the object, same as tags).
 */
export function ActionPlanSection({
  dump,
  onUpdate,
}: {
  dump: Dump
  onUpdate: (dump: Dump) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  async function generate(): Promise<void> {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/dumps/${dump.id}/action-plan`, { method: 'POST' })
      const json = (await res.json().catch(() => null)) as {
        data?: Dump
        error?: { message?: string }
      } | null
      if (!res.ok || !json?.data) throw new Error(json?.error?.message ?? 'Failed')
      onUpdate(json.data)
      setExpanded(true)
    } catch {
      setError('We could not create an action plan. Try again.')
    } finally {
      setGenerating(false)
    }
  }

  /** Optimistically replace the plan; roll back if the server rejects it. */
  async function savePlan(next: ActionPlan): Promise<void> {
    if (!dump.action_plan) return
    const previous = dump.action_plan
    onUpdate({ ...dump, action_plan: next })
    setError(null)
    try {
      const res = await fetch(`/api/v1/dumps/${dump.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action_plan: next }),
      })
      if (!res.ok) throw new Error('failed')
    } catch {
      onUpdate({ ...dump, action_plan: previous })
      setError('That change did not save. Try again.')
    }
  }

  function toggleItem(itemId: string): void {
    const plan = dump.action_plan
    if (!plan) return
    void savePlan({
      ...plan,
      items: plan.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)),
    })
  }

  function removeItem(itemId: string): void {
    const plan = dump.action_plan
    if (!plan) return
    void savePlan({ ...plan, items: plan.items.filter((i) => i.id !== itemId) })
  }

  function addItem(): void {
    const plan = dump.action_plan
    const text = draft.trim().slice(0, MAX_ITEM_LENGTH)
    setDraft('')
    if (!plan || !text || plan.items.length >= MAX_ITEMS) return
    void savePlan({
      ...plan,
      items: [...plan.items, { id: crypto.randomUUID(), text, done: false }],
    })
  }

  if (!dump.action_plan) {
    return (
      <div data-no-print className="border-ink/10 flex flex-col gap-2 border-t pt-4">
        <Button variant="secondary" size="md" onClick={generate} disabled={generating}>
          {generating ? 'Generating…' : 'Create action plan'}
        </Button>
        {error ? (
          <p role="alert" className="text-muted text-sm">
            {error}
          </p>
        ) : null}
      </div>
    )
  }

  const items = dump.action_plan.items
  const doneCount = items.filter((i) => i.done).length
  const allDone = items.length > 0 && doneCount === items.length
  const progress = items.length > 0 ? doneCount / items.length : 0

  return (
    <div data-no-print className="border-ink/10 flex flex-col gap-2 border-t pt-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex min-h-11 items-center justify-between gap-3 text-left text-[15px]"
      >
        <span className="flex items-center gap-2">
          Action plan
          <span
            className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
              allDone ? 'bg-flame text-white' : 'bg-ink/5 text-muted'
            }`}
          >
            {doneCount}/{items.length}
          </span>
        </span>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted"
        >
          <ChevronDownIcon size={18} />
        </motion.span>
      </button>

      {/* Progress bar — visible even collapsed, so progress reads at a glance. */}
      <div className="bg-ink/5 h-1.5 overflow-hidden rounded-full">
        <motion.div
          className="bg-flame h-full rounded-full"
          initial={false}
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        />
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="items"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <ul className="flex flex-col pt-1 pb-1">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <PlanItemRow
                    key={item.id}
                    item={item}
                    onToggle={() => toggleItem(item.id)}
                    onRemove={() => removeItem(item.id)}
                  />
                ))}
              </AnimatePresence>
            </ul>

            <AnimatePresence>
              {allDone ? (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-flame py-1 text-sm"
                >
                  All done — nice work 🎉
                </motion.p>
              ) : null}
            </AnimatePresence>

            {items.length < MAX_ITEMS ? (
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  value={draft}
                  maxLength={MAX_ITEM_LENGTH}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addItem()
                    }
                  }}
                  placeholder="Add your own step"
                  aria-label="Add a step to the action plan"
                  className="rounded-btn border-ink/15 placeholder:text-muted focus:border-ink h-11 w-full border bg-transparent px-3 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={addItem}
                  disabled={!draft.trim()}
                  aria-label="Add step"
                  className="rounded-btn border-ink/15 text-ink hover:bg-ink/[0.04] flex h-11 w-11 shrink-0 items-center justify-center border transition-colors disabled:opacity-40"
                >
                  <PlusIcon size={16} />
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void generate()}
              disabled={generating}
              className="text-muted hover:text-ink mt-2 min-h-11 self-start text-xs underline underline-offset-4 disabled:opacity-60"
            >
              {generating ? 'Regenerating…' : 'Regenerate'}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {error ? (
        <p role="alert" className="text-muted text-sm">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** One checklist row: springy custom checkbox, animated strike-through, delete. */
function PlanItemRow({
  item,
  onToggle,
  onRemove,
}: {
  item: ActionPlanItem
  onToggle: () => void
  onRemove: () => void
}) {
  return (
    <motion.li
      initial={false}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18 }}
      className="overflow-hidden"
    >
      <div className="flex min-h-11 items-center gap-3 py-1">
        <motion.button
          type="button"
          role="checkbox"
          aria-checked={item.done}
          aria-label={item.done ? `Mark "${item.text}" not done` : `Mark "${item.text}" done`}
          onClick={onToggle}
          whileTap={{ scale: 0.85 }}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            item.done ? 'border-flame bg-flame' : 'border-ink/25 bg-transparent'
          }`}
        >
          <motion.svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            initial={false}
            animate={{ scale: item.done ? 1 : 0, opacity: item.done ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 26 }}
          >
            <path
              d="M2 6.5 4.8 9 10 3.5"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        </motion.button>

        <button
          type="button"
          onClick={onToggle}
          className="min-w-0 flex-1 py-1 text-left text-[15px]"
        >
          {/* line-through (not a drawn line) so multi-line items strike correctly. */}
          <span
            className={`transition-colors duration-200 ${
              item.done ? 'text-muted decoration-ink/40 line-through' : ''
            }`}
          >
            {item.text}
          </span>
        </button>

        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove "${item.text}"`}
          className="text-muted hover:text-ink -m-2 shrink-0 p-2 transition-colors"
        >
          <XIcon size={14} />
        </button>
      </div>
    </motion.li>
  )
}
