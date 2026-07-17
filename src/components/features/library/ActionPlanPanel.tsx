'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { ActionPlan, ActionPlanItem, Dump } from '@/types/dump'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { PlusIcon, XIcon } from '@/components/ui/icons'

const MAX_ITEMS = 20
const MAX_ITEM_LENGTH = 280

/**
 * The action plan as a full page (the right-hand panel of the dump detail
 * swipe pair). Generated on demand from the cleaned transcript — the first
 * time the panel becomes active without a plan, generation starts on its own
 * and a progress state fills the page. Once a plan exists it's a live
 * checklist: progress bar, springy checkboxes, add-your-own steps, per-item
 * delete. Every edit PATCHes the whole plan back (the API replaces the
 * object, same as tags).
 */
export function ActionPlanPanel({
  dump,
  onUpdate,
  active,
}: {
  dump: Dump | null
  onUpdate: (dump: Dump) => void
  active: boolean
}) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  // Auto-generate only once per visit — a failure switches to a manual retry.
  const autoTriggered = useRef(false)

  async function generate(): Promise<void> {
    if (!dump) return
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
    } catch {
      setError('We could not create an action plan. Try again.')
    } finally {
      setGenerating(false)
    }
  }

  // Swiping over to an idea with no plan yet kicks generation off by itself —
  // the swipe IS the request.
  useEffect(() => {
    if (!active || autoTriggered.current) return
    if (!dump || dump.status !== 'ready' || dump.action_plan || generating) return
    autoTriggered.current = true
    void generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, dump])

  /** Optimistically replace the plan; roll back if the server rejects it. */
  async function savePlan(next: ActionPlan): Promise<void> {
    if (!dump?.action_plan) return
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
    const plan = dump?.action_plan
    if (!plan) return
    void savePlan({
      ...plan,
      items: plan.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)),
    })
  }

  function removeItem(itemId: string): void {
    const plan = dump?.action_plan
    if (!plan) return
    void savePlan({ ...plan, items: plan.items.filter((i) => i.id !== itemId) })
  }

  function addItem(): void {
    const plan = dump?.action_plan
    const text = draft.trim().slice(0, MAX_ITEM_LENGTH)
    setDraft('')
    if (!plan || !text || plan.items.length >= MAX_ITEMS) return
    void savePlan({
      ...plan,
      items: [...plan.items, { id: crypto.randomUUID(), text, done: false }],
    })
  }

  const items = dump?.action_plan?.items ?? []
  const doneCount = items.filter((i) => i.done).length
  const allDone = items.length > 0 && doneCount === items.length
  const progress = items.length > 0 ? doneCount / items.length : 0

  return (
    <div className="flex flex-1 flex-col gap-4 pt-2">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2.5 text-2xl tracking-tight">
          Action plan
          {items.length > 0 ? (
            <span
              className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                allDone ? 'bg-flame text-white' : 'bg-ink/5 text-muted'
              }`}
            >
              {doneCount}/{items.length}
            </span>
          ) : null}
        </h1>
        {dump?.title ? <p className="text-muted text-xs">{dump.title}</p> : null}
      </header>

      {!dump || dump.status !== 'ready' ? (
        <p className="text-muted flex flex-1 items-center justify-center py-16 text-sm">
          {dump ? 'This idea is still processing…' : 'Loading…'}
        </p>
      ) : !dump.action_plan ? (
        generating || !error ? (
          <GeneratingState />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="text-muted text-sm">{error}</p>
            <Button variant="secondary" size="md" onClick={() => void generate()}>
              Try again
            </Button>
          </div>
        )
      ) : (
        <>
          <div className="bg-ink/5 h-1.5 overflow-hidden rounded-full">
            <motion.div
              className="bg-flame h-full rounded-full"
              initial={false}
              animate={{ width: `${progress * 100}%` }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            />
          </div>

          <ul className="flex flex-col">
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
                className="text-flame text-sm"
              >
                All done — nice work 🎉
              </motion.p>
            ) : null}
          </AnimatePresence>

          {items.length < MAX_ITEMS ? (
            <div className="flex items-center gap-2">
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
                className="rounded-btn border-ink/15 placeholder:text-muted focus:border-ink h-11 w-full border bg-transparent px-3 text-base outline-none"
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
            className="text-muted hover:text-ink min-h-11 self-start text-xs underline underline-offset-4 disabled:opacity-60"
          >
            {generating ? 'Regenerating…' : 'Regenerate'}
          </button>

          {error ? (
            <p role="alert" className="text-muted text-sm">
              {error}
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}

/** Full-panel progress state while Claude drafts the plan. */
function GeneratingState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <Spinner size={22} className="text-flame" />
      <motion.p
        animate={{ opacity: [0.55, 1, 0.55] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        className="text-muted max-w-xs text-sm"
      >
        Dumpty is turning this idea into a step-by-step plan…
      </motion.p>
    </div>
  )
}

/** One checklist row: springy custom checkbox, line-through, delete. */
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
