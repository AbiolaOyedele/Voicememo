'use client'

import { useCallback, useEffect, useState } from 'react'

export type DeviceKind = 'ios' | 'android' | 'desktop' | 'other'

/** The non-standard `beforeinstallprompt` event Chromium browsers fire. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function detectDevice(): DeviceKind {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  // iPadOS 13+ reports as "Macintosh" but exposes multi-touch, unlike a real Mac.
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
  if (isIOS) return 'ios'
  if (/Android/.test(ua)) return 'android'
  if (/Windows|Macintosh|Linux/.test(ua)) return 'desktop'
  return 'other'
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

interface InstallPromptState {
  /** Device family, used to pick which install instructions to show. */
  device: DeviceKind
  /** True once we know the app is already installed (or can't tell yet). */
  installed: boolean
  /** True when the browser gave us a native install prompt to trigger. */
  canPromptNatively: boolean
  /** Trigger the native install dialog. No-op (returns 'unavailable') if none was captured. */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
}

/**
 * Detects the device family and, on Chromium browsers that support it,
 * captures the native `beforeinstallprompt` event so the app can trigger a
 * one-tap install instead of falling back to manual Share-sheet instructions
 * (the only option on iOS Safari, which has no install API at all).
 */
export function useInstallPrompt(): InstallPromptState {
  const [device, setDevice] = useState<DeviceKind>('other')
  // Assume installed until checked, so the prompt never flashes before we know.
  const [installed, setInstalled] = useState(true)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    setDevice(detectDevice())
    setInstalled(isStandalone())

    const onPrompt = (e: Event): void => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = (): void => setInstalled(true)

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferred) return 'unavailable'
    await deferred.prompt()
    const choice = await deferred.userChoice
    setDeferred(null)
    return choice.outcome
  }, [deferred])

  return { device, installed, canPromptNatively: deferred !== null, promptInstall }
}
