import type { MetadataRoute } from 'next'

/**
 * PWA manifest (served at /manifest.webmanifest). Makes Idea Dump installable
 * and launches straight to the Record tab in a standalone window.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Idea Dump',
    short_name: 'Idea Dump',
    description: 'Speak your ideas freely. Get back a clean, segmented, readable version.',
    start_url: '/record',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
