import type { Metadata, Viewport } from 'next'
import './globals.css'
import { noirPro, dumptyLogo } from './fonts'
import { ToastProvider } from '@/components/ui/Toast'
import { VisitTracker } from '@/components/ui/VisitTracker'

export const metadata: Metadata = {
  title: {
    default: 'Dumpty',
    template: '%s · Dumpty',
  },
  description: 'Speak your ideas freely. Get back a clean, segmented, readable version.',
  applicationName: 'Dumpty',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Dumpty',
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
  // Keeps `position: fixed` elements (the TabBar) anchored to the true layout
  // viewport when the on-screen keyboard opens — e.g. the Library search
  // input — instead of the browser resizing only the visual viewport and
  // leaving fixed elements pinned behind the keyboard.
  interactiveWidget: 'resizes-content',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${noirPro.variable} ${dumptyLogo.variable} h-full antialiased`}>
      <body className="bg-canvas text-ink flex min-h-full flex-col">
        <VisitTracker />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
