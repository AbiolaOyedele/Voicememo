import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// Browser-tab favicon / PWA icon: the Dumpty "D" wordmark glyph on black.
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default async function Icon() {
  const font = await readFile(join(process.cwd(), 'public/fonts/Sketcha-Kits.otf'))
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000000',
          color: '#ffffff',
          fontFamily: 'Sketcha',
          fontSize: 380,
          paddingBottom: 40,
        }}
      >
        D
      </div>
    ),
    { ...size, fonts: [{ name: 'Sketcha', data: font, style: 'normal', weight: 400 }] },
  )
}
