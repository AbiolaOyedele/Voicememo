import localFont from 'next/font/local'

/**
 * NoirPro — the app's brand/body typeface, exposed as `--font-noirpro` and wired
 * into `--font-sans` in globals.css. We ship Light/Regular/Medium weights; bolder
 * headings (600/700) fall back to the browser's synthetic bold of Medium.
 */
export const noirPro = localFont({
  src: [
    { path: '../../public/fonts/NoirPro-Light.woff2', weight: '300', style: 'normal' },
    { path: '../../public/fonts/NoirPro-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/NoirPro-Medium.woff2', weight: '500', style: 'normal' },
  ],
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
