'use client'

import React, { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Mic, Sparkles, ListTree, ListChecks, List, User, type LucideIcon } from 'lucide-react'
import { VoicePoweredOrb } from '@/components/ui/voice-powered-orb'
import { ThoughtStream } from '@/components/ui/thought-stream'
import { cn } from '@/lib/utils'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

/**
 * Cinematic, scroll-pinned landing hero for Dumpty.
 *
 * On brand: a pure-white canvas, one flame accent (`--color-flame`), and a
 * flame-orange brand card. The phone mockup mirrors the real app record screen
 * (white screen, flame wordmark, the WebGL voice orb), and the product features
 * reveal one at a time as you scroll.
 */

/**
 * Viewport dimensions with a defensive fallback. Some headless/preview
 * renderers momentarily report `window.innerHeight/innerWidth` as 0, which
 * would collapse the scroll-driven translations below. Falling back to the
 * document client box keeps the timeline geometry correct.
 */
function viewport() {
  const w = window.innerWidth || document.documentElement.clientWidth || 1280
  const h = window.innerHeight || document.documentElement.clientHeight || 800
  return { w, h }
}

interface Feature {
  Icon: LucideIcon
  title: string
  sub: string
  /** Placement of the floating badge around the phone. */
  place: string
}

/** The real Dumpty features, revealed one per scroll around the phone. */
const FEATURES: Feature[] = [
  { Icon: Mic, title: 'Auto-transcribed', sub: 'No more "wait, what did I say?"', place: 'top-4 left-[-12px] lg:top-8 lg:left-[-90px]' },
  { Icon: Sparkles, title: 'Cleaned up', sub: 'Rambles → readable', place: 'top-16 right-[-12px] lg:top-24 lg:right-[-90px]' },
  { Icon: ListTree, title: 'Topic-segmented', sub: 'Sorted, not scattered', place: 'bottom-16 left-[-12px] lg:bottom-28 lg:left-[-90px]' },
  { Icon: ListChecks, title: 'To-do ready', sub: 'Ideas become action', place: 'bottom-4 right-[-12px] lg:bottom-10 lg:right-[-90px]' },
]

const INJECTED_STYLES = `
  .gsap-reveal { visibility: hidden; }

  /* Environment Overlays */
  .film-grain {
      position: absolute; inset: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 50; opacity: 0.04; mix-blend-mode: multiply;
      background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23noiseFilter)"/></svg>');
  }

  .bg-grid-theme {
      background-size: 60px 60px;
      background-image:
          linear-gradient(to right, color-mix(in srgb, var(--color-ink) 5%, transparent) 1px, transparent 1px),
          linear-gradient(to bottom, color-mix(in srgb, var(--color-ink) 5%, transparent) 1px, transparent 1px);
      mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
      -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
  }

  /* OUTSIDE THE CARD: matte black ink with a soft physical shadow */
  .text-3d-matte {
      color: var(--color-ink);
      text-shadow:
          0 10px 30px color-mix(in srgb, var(--color-ink) 18%, transparent),
          0 2px 4px color-mix(in srgb, var(--color-ink) 8%, transparent);
  }

  .text-silver-matte {
      background: linear-gradient(180deg, var(--color-ink) 0%, color-mix(in srgb, var(--color-ink) 45%, transparent) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      transform: translateZ(0);
      filter:
          drop-shadow(0px 10px 20px color-mix(in srgb, var(--color-ink) 12%, transparent))
          drop-shadow(0px 2px 4px color-mix(in srgb, var(--color-ink) 8%, transparent));
  }

  /* The brand card: a plain flame-orange surface */
  .premium-depth-card {
      background: var(--color-flame);
      box-shadow:
          0 40px 100px -20px rgba(0, 0, 0, 0.35),
          0 20px 40px -20px rgba(0, 0, 0, 0.25);
      position: relative;
  }

  /* Realistic iPhone mockup hardware */
  .iphone-bezel {
      background-color: #111;
      box-shadow:
          inset 0 0 0 2px #52525B,
          inset 0 0 0 7px #000,
          0 40px 80px -15px rgba(0,0,0,0.5),
          0 15px 25px -5px rgba(0,0,0,0.35);
      transform-style: preserve-3d;
  }

  .hardware-btn {
      background: linear-gradient(90deg, #404040 0%, #171717 100%);
      box-shadow:
          -2px 0 5px rgba(0,0,0,0.8),
          inset -1px 0 1px rgba(255,255,255,0.15),
          inset 1px 0 2px rgba(0,0,0,0.8);
      border-left: 1px solid rgba(255,255,255,0.05);
  }

  .screen-glare {
      background: linear-gradient(110deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 40%);
  }

  /* Feature badge — clean white chip on the flame card */
  .feature-badge {
      background: #ffffff;
      box-shadow:
          0 0 0 1px rgba(0, 0, 0, 0.04),
          0 18px 40px -12px rgba(60, 15, 0, 0.45);
  }

  /* Hero entrance driven by CSS (not GSAP) so it always plays on mount,
     independent of StrictMode double-invokes or HMR context churn. */
  @keyframes hero-rise {
      from { opacity: 0; transform: translateY(60px) scale(0.85); filter: blur(20px); }
      to   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
  }
  @keyframes hero-wipe {
      from { clip-path: inset(0 100% 0 0); }
      to   { clip-path: inset(0 0% 0 0); }
  }
  .hero-logo { animation: hero-rise 1.4s cubic-bezier(0.16, 1, 0.3, 1) 0s both; }
  .text-track { animation: hero-rise 1.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both; }
  .text-days { animation: hero-wipe 1.3s cubic-bezier(0.76, 0, 0.24, 1) 0.9s both; }
  .hero-cta { animation: hero-rise 1.4s cubic-bezier(0.16, 1, 0.3, 1) 1.4s both; }

  /* "Typical." settles as silver, wipes out, then wipes back in as the
     flame-orange logo mark. */
  .typical-flame {
      color: var(--color-flame);
      -webkit-text-fill-color: var(--color-flame);
      background: none;
  }
  @keyframes typical-wipe-out {
      from { clip-path: inset(0 0% 0 0); }
      to   { clip-path: inset(0 100% 0 0); }
  }
  @keyframes typical-wipe-in {
      from { clip-path: inset(0 100% 0 0); }
      to   { clip-path: inset(0 0% 0 0); }
  }
  .typical-out { animation: typical-wipe-out 0.45s cubic-bezier(0.76, 0, 0.24, 1) both; }
  .typical-in  { animation: typical-wipe-in 0.5s cubic-bezier(0.76, 0, 0.24, 1) both; }
`

export interface CinematicHeroProps extends React.HTMLAttributes<HTMLDivElement> {
  brandName?: string
  tagline1?: string
  tagline2?: string
  /** Trailing word of tagline 2 that morphs into the flame-orange logo mark. */
  highlightWord?: string
  cardHeading?: string
  cardDescription?: React.ReactNode
  ctaHeading?: string
  ctaDescription?: string
  /** Where the primary "Try Dumpty" button points. */
  ctaHref?: string
}

export function CinematicHero({
  brandName = 'Dumpty',
  tagline1 = 'You had a great idea.',
  tagline2 = 'Then you lost it.',
  highlightWord = 'Typical.',
  cardHeading = 'Raw thoughts in, tidy ideas out.',
  cardDescription = (
    <>
      Ideas don&apos;t wait for a notebook. Dump them into{' '}
      <span className="font-semibold text-white">Dumpty</span> raw, we&apos;ll transcribe it, tidy it
      up, and split it by topic so future you doesn&apos;t have to untangle past you&apos;s rambling.
    </>
  ),
  ctaHeading = 'Stop losing your best ideas.',
  ctaDescription = 'One voice note is all it takes. Dumpty cleans it, sorts it, and hands you back a to-do list, so that 3am shower thought doesn’t die in your Notes app.',
  ctaHref = '/login',
  className,
  ...props
}: CinematicHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mainCardRef = useRef<HTMLDivElement>(null)
  const mockupRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef<number>(0)

  // "Typical." settles as silver, then (after a beat) wipes out and wipes back
  // in as the flame-orange logo mark. 'in' → 'out' → 'flame'.
  const [typicalPhase, setTypicalPhase] = useState<'in' | 'out' | 'flame'>('in')
  useEffect(() => {
    const t = setTimeout(() => setTypicalPhase('out'), 2400)
    return () => clearTimeout(t)
  }, [])
  const handleTypicalAnimEnd = () => {
    // The out-wipe just finished (word fully hidden) — swap style, wipe back in.
    setTypicalPhase((p) => (p === 'out' ? 'flame' : p))
  }

  // 1. High-performance mouse interaction (requestAnimationFrame throttled)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { w: vw, h: vh } = viewport()
      if (window.scrollY > vh * 2) return

      cancelAnimationFrame(requestRef.current)

      requestRef.current = requestAnimationFrame(() => {
        if (mainCardRef.current && mockupRef.current) {
          const rect = mainCardRef.current.getBoundingClientRect()
          const mouseX = e.clientX - rect.left
          const mouseY = e.clientY - rect.top

          mainCardRef.current.style.setProperty('--mouse-x', `${mouseX}px`)
          mainCardRef.current.style.setProperty('--mouse-y', `${mouseY}px`)

          const xVal = (e.clientX / vw - 0.5) * 2
          const yVal = (e.clientY / vh - 0.5) * 2

          gsap.to(mockupRef.current, {
            rotationY: xVal * 12,
            rotationX: -yVal * 12,
            ease: 'power3.out',
            duration: 1.2,
          })
        }
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(requestRef.current)
    }
  }, [])

  // 2. Cinematic scroll timeline
  useEffect(() => {
    const { w: vw, h: vh } = viewport()
    const isMobile = vw < 768

    // Clear any triggers orphaned by a hot-module reload so a stale pin can't
    // leave the reveal elements stuck hidden. No-op on a clean production mount.
    ScrollTrigger.getAll().forEach((t) => t.kill())

    const ctx = gsap.context(() => {
      gsap.set('.main-card', { y: vh + 200, autoAlpha: 1 })
      // The brand logo rides in with the card and is visible first.
      gsap.set('.card-brand-reveal', { autoAlpha: 1 })
      gsap.set(
        [
          '.card-left-text',
          '.card-right-text',
          '.card-outro-text',
          '.mockup-scroll-wrapper',
          '.feature-badge',
          '.phone-widget',
        ],
        { autoAlpha: 0 }
      )
      gsap.set('.cta-wrapper', { autoAlpha: 0, scale: 0.8, filter: 'blur(30px)' })

      // The hero entrance is handled by CSS keyframes (see INJECTED_STYLES);
      // GSAP only owns the scroll-driven choreography below.
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: '+=5200',
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      })

      scrollTl
        .to(
          ['.hero-text-wrapper', '.bg-grid-theme', '.thought-stream'],
          { scale: 1.15, filter: 'blur(20px)', opacity: 0.2, ease: 'power2.inOut', duration: 2 },
          0
        )
        .to('.main-card', { y: 0, ease: 'power3.inOut', duration: 2 }, 0)
        .to('.main-card', {
          width: '100%',
          height: '100%',
          borderRadius: '0px',
          ease: 'power3.inOut',
          duration: 1.5,
        })
        // Hold on the brand logo, then let it clear the way for the phone.
        .to({}, { duration: 0.6 })
        .to('.card-brand-reveal', {
          autoAlpha: 0,
          scale: 1.25,
          filter: 'blur(10px)',
          ease: 'power2.in',
          duration: 1,
        })
        .fromTo(
          '.mockup-scroll-wrapper',
          { y: 300, z: -500, rotationX: 50, rotationY: -30, autoAlpha: 0, scale: 0.6 },
          {
            y: 0,
            z: 0,
            rotationX: 0,
            rotationY: 0,
            autoAlpha: 1,
            scale: 1,
            ease: 'expo.out',
            duration: 2.5,
          },
          '-=0.4'
        )
        .fromTo(
          '.phone-widget',
          { y: 40, autoAlpha: 0, scale: 0.95 },
          { y: 0, autoAlpha: 1, scale: 1, stagger: 0.15, ease: 'back.out(1.2)', duration: 1.5 },
          '-=1.5'
        )
        .fromTo(
          '.card-left-text',
          { x: -50, autoAlpha: 0 },
          { x: 0, autoAlpha: 1, ease: 'power4.out', duration: 1.5 },
          '-=1'
        )
        // The wordmark above the phone simply fades in (no scale).
        .fromTo(
          '.card-right-text',
          { autoAlpha: 0 },
          { autoAlpha: 1, ease: 'power2.out', duration: 1.5 },
          '<'
        )

      // Features reveal one at a time, each on its own scroll beat.
      FEATURES.forEach((_, i) => {
        scrollTl
          .fromTo(
            `.feature-badge-${i}`,
            { y: 60, autoAlpha: 0, scale: 0.7, rotationZ: -8 },
            { y: 0, autoAlpha: 1, scale: 1, rotationZ: 0, ease: 'back.out(1.6)', duration: 1 }
          )
          .to({}, { duration: 0.7 })
      })

      scrollTl
        .to({}, { duration: 0.8 })
        .set('.hero-text-wrapper', { autoAlpha: 0 })
        .set('.cta-wrapper', { autoAlpha: 1 })
        // Clear the phone, badges and side labels.
        .to(
          ['.mockup-scroll-wrapper', '.feature-badge', '.card-left-text', '.card-right-text'],
          { scale: 0.9, y: -40, z: -200, autoAlpha: 0, ease: 'power3.in', duration: 1, stagger: 0.04 }
        )
        // The "ramble" line rises to the middle of the card so it never sits empty.
        .fromTo(
          '.card-outro-text',
          { y: 90, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, ease: 'power3.out', duration: 1.3 },
          '-=0.4'
        )
        .to({}, { duration: 0.7 })
        // Pull the card back (the ramble text rides inside it) while the CTA settles in.
        .to(
          '.main-card',
          {
            width: isMobile ? '92vw' : '85vw',
            height: isMobile ? '92vh' : '85vh',
            borderRadius: isMobile ? '32px' : '40px',
            ease: 'expo.inOut',
            duration: 1.8,
          },
          'pullback'
        )
        .to('.cta-wrapper', { scale: 1, filter: 'blur(0px)', ease: 'expo.inOut', duration: 1.8 }, 'pullback')
        // Card and its ramble text exit upward together, revealing the CTA.
        .to('.main-card', { y: -vh - 300, ease: 'power3.in', duration: 1.5 })
    }, containerRef)

    // Recompute pin/scroll geometry once layout has settled; guards against an
    // initial measure taken before the viewport reported its real size.
    const refresh = requestAnimationFrame(() => ScrollTrigger.refresh())

    return () => {
      cancelAnimationFrame(refresh)
      ctx.revert()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn(
        'bg-canvas text-ink relative flex h-screen w-screen items-center justify-center overflow-hidden font-sans antialiased',
        className
      )}
      style={{ perspective: '1500px' }}
      {...props}
    >
      <style dangerouslySetInnerHTML={{ __html: INJECTED_STYLES }} />
      <div className="film-grain" aria-hidden="true" />
      <div className="bg-grid-theme absolute inset-0 z-0 pointer-events-none opacity-50" aria-hidden="true" />

      {/* AMBIENT LAYER: half-formed thoughts drifting behind the hero text */}
      <ThoughtStream className="thought-stream z-[5]" />

      {/* BACKGROUND LAYER: Hero texts + opening CTA */}
      <div className="hero-text-wrapper transform-style-3d absolute z-10 flex w-screen flex-col items-center justify-center px-4 text-center will-change-transform">
        <span
          className="hero-logo text-flame mb-3 block text-2xl leading-none sm:text-3xl md:mb-4 md:text-4xl"
          style={{ fontFamily: 'var(--font-logo)' }}
        >
          {brandName}
        </span>
        <h1 className="text-track text-3d-matte mb-2 text-4xl font-bold tracking-tight sm:text-5xl md:text-7xl lg:text-[6rem]">
          {tagline1}
        </h1>
        <h1 className="text-days text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-7xl lg:text-[6rem]">
          <span className="text-silver-matte">{tagline2} </span>
          <span
            onAnimationEnd={handleTypicalAnimEnd}
            className={cn(
              'inline-block',
              typicalPhase === 'flame' ? 'typical-flame typical-in' : 'text-silver-matte',
              typicalPhase === 'out' && 'typical-out'
            )}
            style={typicalPhase === 'flame' ? { fontFamily: 'var(--font-logo)' } : undefined}
          >
            {highlightWord}
          </span>
        </h1>
        <div className="hero-cta pointer-events-auto mt-10">
          <a
            href={ctaHref}
            className="bg-flame rounded-btn focus:ring-flame inline-flex min-h-12 items-center justify-center px-6 text-base font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
          >
            Try Dumpty
          </a>
        </div>
      </div>

      {/* BACKGROUND LAYER 2: closing CTA (with the app's voice orb) */}
      <div className="cta-wrapper gsap-reveal pointer-events-auto absolute z-10 flex w-screen flex-col items-center justify-center px-4 text-center will-change-transform">
        <h2 className="text-silver-matte mb-6 text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
          {ctaHeading}
        </h2>
        <p className="text-muted mb-8 mx-auto max-w-xl text-lg font-light leading-relaxed md:text-xl">
          {ctaDescription}
        </p>
        {/* The orange voice orb, straight from the app, sits between the copy and the CTA. */}
        <div className="mb-8 h-40 w-40 md:h-48 md:w-48" aria-hidden="true">
          <VoicePoweredOrb enableVoiceControl={false} demo coreColor={[1, 0.31, 0.012]} />
        </div>
        <div className="flex justify-center">
          <a
            href={ctaHref}
            className="bg-flame rounded-btn focus:ring-flame inline-flex min-h-12 items-center justify-center px-6 text-base font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
          >
            Try Dumpty
          </a>
        </div>
      </div>

      {/* FOREGROUND LAYER: the flame brand card */}
      <div
        className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
        style={{ perspective: '1500px' }}
      >
        <div
          ref={mainCardRef}
          className="main-card premium-depth-card gsap-reveal pointer-events-auto relative flex h-[92vh] w-[92vw] items-center justify-center overflow-hidden rounded-[32px] md:h-[85vh] md:w-[85vw] md:rounded-[40px]"
        >
          {/* Brand logo revealed first as the card arrives, then it clears the
              way for the phone mockup (see the scroll timeline). */}
          <div className="card-brand-reveal gsap-reveal pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
            <span
              className="text-white leading-none tracking-tight text-7xl md:text-[9rem] lg:text-[11rem]"
              style={{ fontFamily: 'var(--font-logo)' }}
            >
              {brandName}
            </span>
          </div>

          {/* Outro line: rises to centre as the phone leaves, then exits with the card. */}
          <div className="card-outro-text gsap-reveal pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center px-8 text-center">
            <h3 className="text-3xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
              {cardHeading}
            </h3>
            <p className="mt-5 max-w-md text-base font-normal leading-relaxed text-white/85 md:text-lg">
              {cardDescription}
            </p>
          </div>

          <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col items-center justify-evenly px-4 py-6 lg:grid lg:grid-cols-3 lg:gap-8 lg:px-12 lg:py-0">
            {/* TOP (mobile) / RIGHT (desktop): brand wordmark */}
            <div className="card-right-text gsap-reveal z-20 order-1 flex w-full justify-center lg:order-3 lg:justify-end">
              <h2
                className="text-white text-6xl leading-none tracking-tight md:text-[5rem] lg:text-[6.5rem]"
                style={{ fontFamily: 'var(--font-logo)' }}
              >
                {brandName}
              </h2>
            </div>

            {/* MIDDLE (mobile) / CENTER (desktop): iPhone mockup with the real record screen */}
            <div
              className="mockup-scroll-wrapper relative z-10 order-2 flex h-[380px] w-full items-center justify-center lg:order-2 lg:h-[600px]"
              style={{ perspective: '1000px' }}
            >
              <div className="relative flex h-full w-full scale-[0.65] items-center justify-center transform md:scale-[0.85] lg:scale-100">
                <div
                  ref={mockupRef}
                  className="iphone-bezel transform-style-3d relative flex h-[580px] w-[280px] flex-col rounded-[3rem] will-change-transform"
                >
                  {/* Hardware buttons */}
                  <div className="hardware-btn absolute top-[120px] -left-[3px] z-0 h-[25px] w-[3px] rounded-l-md" aria-hidden="true" />
                  <div className="hardware-btn absolute top-[160px] -left-[3px] z-0 h-[45px] w-[3px] rounded-l-md" aria-hidden="true" />
                  <div className="hardware-btn absolute top-[220px] -left-[3px] z-0 h-[45px] w-[3px] rounded-l-md" aria-hidden="true" />
                  <div className="hardware-btn absolute top-[170px] -right-[3px] z-0 h-[70px] w-[3px] scale-x-[-1] rounded-r-md" aria-hidden="true" />

                  {/* Screen — white, exactly like the app */}
                  <div className="absolute inset-[7px] z-10 overflow-hidden rounded-[2.5rem] bg-white text-ink">
                    <div className="screen-glare pointer-events-none absolute inset-0 z-40" aria-hidden="true" />

                    {/* Dynamic island (black hardware) */}
                    <div className="absolute top-[5px] left-1/2 z-50 flex h-[28px] w-[100px] -translate-x-1/2 items-center justify-end rounded-full bg-black px-3 shadow-[inset_0_-1px_2px_rgba(255,255,255,0.1)]">
                      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff4f03] shadow-[0_0_8px_rgba(255,79,3,0.9)]" />
                    </div>

                    {/* Record screen — the full app: wordmark, hint, orb, tab bar */}
                    <div className="relative flex h-full w-full flex-col items-center px-6 pb-4 pt-16">
                      <div className="phone-widget flex flex-col items-center text-center">
                        <span
                          className="text-flame text-4xl leading-none"
                          style={{ fontFamily: 'var(--font-logo)' }}
                        >
                          Dumpty
                        </span>
                        <p className="text-muted mt-2 px-2 text-[11px] leading-snug">
                          Tap the orb before this thought escapes.
                        </p>
                      </div>

                      {/* The app's voice orb, centred and shadow-free */}
                      <div className="phone-widget flex flex-1 items-center justify-center">
                        <div className="h-48 w-48" aria-hidden="true">
                          <VoicePoweredOrb enableVoiceControl={false} demo coreColor={[1, 0.31, 0.012]} />
                        </div>
                      </div>

                      {/* Floating tab bar pill (Library · Record · Account) */}
                      <div className="phone-widget flex w-full justify-center pb-1">
                        <div className="border-ink/10 bg-canvas flex items-center gap-1 rounded-full border p-1.5">
                          <span className="text-muted flex h-9 min-w-9 items-center justify-center rounded-full px-2">
                            <List className="h-5 w-5" strokeWidth={2} />
                          </span>
                          <span className="bg-flame/12 text-flame flex h-9 items-center justify-center gap-1.5 rounded-full px-3">
                            <Mic className="h-5 w-5" strokeWidth={2} />
                            <span className="text-xs font-medium">Record</span>
                          </span>
                          <span className="text-muted flex h-9 min-w-9 items-center justify-center rounded-full px-2">
                            <User className="h-5 w-5" strokeWidth={2} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating feature badges — reveal one per scroll */}
                {FEATURES.map(({ Icon, title, sub, place }, i) => (
                  <div
                    key={title}
                    className={cn(
                      'feature-badge gsap-reveal absolute z-30 flex items-center gap-3 rounded-xl p-3 lg:gap-4 lg:rounded-2xl lg:p-4',
                      `feature-badge-${i}`,
                      place
                    )}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ff4f03]/30 bg-gradient-to-b from-[#ff4f03]/25 to-[#ff4f03]/10 lg:h-10 lg:w-10">
                      <Icon className="h-4 w-4 text-[#ff4f03] lg:h-5 lg:w-5" strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-ink text-xs font-bold tracking-tight lg:text-sm">{title}</p>
                      <p className="text-muted text-[10px] font-medium lg:text-xs">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BOTTOM (mobile) / LEFT (desktop): value text */}
            <div className="card-left-text gsap-reveal z-20 order-3 flex w-full flex-col justify-center px-4 text-center lg:order-1 lg:px-0 lg:text-left">
              <h3 className="mb-0 text-2xl font-bold tracking-tight text-white md:text-3xl lg:mb-5 lg:text-4xl">
                {cardHeading}
              </h3>
              <p className="mx-auto hidden max-w-sm text-sm font-normal leading-relaxed text-white/85 md:block md:text-base lg:mx-0 lg:max-w-none lg:text-lg">
                {cardDescription}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
