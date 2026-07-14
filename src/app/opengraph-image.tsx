import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// Social share preview: the same flame-orange brand-card look used inside the
// hero itself (white Sketcha wordmark + tagline on solid flame), so a link
// shared before someone opens the page still matches the brand.
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpengraphImage() {
  // Only the Sketcha OTF loads here — `next/og`'s Satori renderer parses
  // TTF/OTF but not WOFF2, so NoirPro (shipped as .woff2 for the browser)
  // can't be used in this route. The subtitle falls back to Satori's
  // built-in sans instead of failing the whole image.
  const logoFont = await readFile(join(process.cwd(), 'public/fonts/Sketcha-Kits.otf'))
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ff4f03',
          color: '#ffffff',
        }}
      >
        <div style={{ fontFamily: 'Sketcha', fontSize: 160, lineHeight: 1 }}>Dumpty</div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 300,
            marginTop: 28,
            opacity: 0.9,
          }}
        >
          You had a great idea. Then you lost it.
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Sketcha', data: logoFont, style: 'normal', weight: 400 }],
    }
  )
}
