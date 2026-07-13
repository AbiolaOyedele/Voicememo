'use client'

import { createContext, useContext, useEffect } from 'react'

/** A page's own refresh action (e.g. re-run its client-side fetch). */
export type RefreshHandler = () => Promise<void> | void

export interface RefreshControl {
  /** Register the active page's refresh action; pass null to fall back to the
   * default server refresh. */
  registerHandler: (fn: RefreshHandler | null) => void
  /** Suppress the pull-to-refresh gesture (e.g. mid-recording). */
  setDisabled: (disabled: boolean) => void
}

export const RefreshControlContext = createContext<RefreshControl | null>(null)

/**
 * Registers the current page's refresh action with the app-shell's single
 * pull-to-refresh gesture. Pages that load data client-side pass their refetch
 * here; server-rendered pages (e.g. Account) skip this and get a default
 * `router.refresh()`. Cleans up on unmount so a stale handler never lingers.
 */
export function useRegisterRefresh(handler: RefreshHandler | null): void {
  const control = useContext(RefreshControlContext)
  useEffect(() => {
    control?.registerHandler(handler)
    return () => control?.registerHandler(null)
  }, [control, handler])
}

/** Disables the app-shell pull-to-refresh while `disabled` is true. */
export function useRefreshDisabled(disabled: boolean): void {
  const control = useContext(RefreshControlContext)
  useEffect(() => {
    control?.setDisabled(disabled)
    return () => control?.setDisabled(false)
  }, [control, disabled])
}
