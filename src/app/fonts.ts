import localFont from 'next/font/local'

/**
 * NoirPro — the app's brand/body typeface.
 *
 * NoirPro is a licensed commercial font, so its files are NOT committed to the
 * repo. Once you have them, drop these three files into `public/fonts/`:
 *
 *   public/fonts/NoirPro-Regular.woff2   (weight 400)
 *   public/fonts/NoirPro-Medium.woff2    (weight 500)
 *   public/fonts/NoirPro-Bold.woff2      (weight 700)
 *
 * Then delete the fallback below and uncomment the `localFont` block. The rest
 * of the app already consumes the `--font-noirpro` CSS variable via the
 * `--font-sans` token in globals.css, so no other change is needed.
 *
 * Until then we ship a system fallback so the app builds and runs cleanly.
 */

// import localFont from 'next/font/local'
//
// export const noirPro = localFont({
//   src: [
//     { path: '../../public/fonts/NoirPro-Regular.woff2', weight: '400', style: 'normal' },
//     { path: '../../public/fonts/NoirPro-Medium.woff2', weight: '500', style: 'normal' },
//     { path: '../../public/fonts/NoirPro-Bold.woff2', weight: '700', style: 'normal' },
//   ],
//   variable: '--font-noirpro',
//   display: 'swap',
//   fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
// })

/** Build-safe placeholder until the licensed NoirPro files are added. */
export const noirPro = { variable: '' } as const

/**
 * Sketcha Kits — the display face used for the "Dumpty" wordmark/logo only.
 * Exposed as the `--font-logo` CSS variable; use it via the <Logo /> component.
 */
export const dumptyLogo = localFont({
  src: [{ path: '../../public/fonts/Sketcha-Kits.otf', weight: '400', style: 'normal' }],
  variable: '--font-logo',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
})
