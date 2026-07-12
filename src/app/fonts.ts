import localFont from 'next/font/local'

/**
 * NoirPro — the app's brand/body typeface, exposed as `--font-noirpro` and wired
 * into `--font-sans` in globals.css. Only the Light (300) weight is shipped —
 * the app never renders NoirPro at any other weight, so `globals.css` pins
 * `body { font-weight: 300 }` and disables synthetic bold/italic.
 */
export const noirPro = localFont({
  src: [{ path: '../../public/fonts/NoirPro-Light.woff2', weight: '300', style: 'normal' }],
  variable: '--font-noirpro',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
})

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
