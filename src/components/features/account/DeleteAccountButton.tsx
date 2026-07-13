'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { clearDumpsCache } from '@/lib/dumps-cache'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

/** Settings row that opens a confirmation dialog, then permanently deletes the account and all its data. */
export function DeleteAccountButton() {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(): Promise<void> {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/account', { method: 'DELETE' })
      if (!res.ok) throw new Error('failed')
      // Never leave this account's cached ideas for the next person on this device.
      clearDumpsCache()
      const supabase = createBrowserSupabaseClient()
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch {
      setError('Could not delete. Try again.')
      setDeleting(false)
    }
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex min-h-11 w-full items-center justify-between px-4 py-3.5 text-left"
      >
        <span className="text-[15px]">Delete account</span>
        <span className="text-muted text-xs">{error ?? 'Everything, permanently'}</span>
      </button>
      <ConfirmDialog
        open={confirming}
        title="Delete your account?"
        description="This permanently deletes your account, every idea, and all recordings. There is no way to undo this."
        confirmLabel="Delete everything"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirming(false)}
      />
    </li>
  )
}
