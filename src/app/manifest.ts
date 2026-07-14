import type { MetadataRoute } from 'next'

/**
 * PWA manifest (served at /manifest.webmanifest). Makes Idea Dump installable
 * and launches straight to the Record tab in a standalone window.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Dumpty',
    short_name: 'Dumpty',
    description: 'Speak your ideas freely. Get back a clean, segmented, readable version.',
    start_url: '/record',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      // PNGs, not SVG: Android/Chrome ignore SVG manifest icons and fall back to
      // a generic glyph, so installed Android icons must be raster.
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
