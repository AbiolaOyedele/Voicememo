import type { Metadata, Viewport } from 'next'
import './globals.css'
import { noirPro } from './fonts'

export const metadata: Metadata = {
  title: {
    default: 'Idea Dump',
    template: '%s · Idea Dump',
  },
  description: 'Speak your ideas freely. Get back a clean, segmented, readable version.',
  applicationName: 'Idea Dump',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Idea Dump',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${noirPro.variable} h-full antialiased`}>
      <body className="bg-canvas text-ink flex min-h-full flex-col">{children}</body>
    </html>
  )
}
