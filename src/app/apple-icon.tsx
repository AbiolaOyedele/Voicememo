import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// iOS home-screen icon (Add to Home Screen). iOS rounds the corners itself, so a
// full-bleed black tile with the Dumpty "D" is correct.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default async function AppleIcon() {
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
          fontSize: 132,
          paddingBottom: 14,
        }}
      >
        D
      </div>
    ),
    { ...size, fonts: [{ name: 'Sketcha', data: font, style: 'normal', weight: 400 }] },
  )
}
