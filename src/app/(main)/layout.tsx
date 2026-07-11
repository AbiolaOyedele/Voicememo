import { AppShell } from '@/components/ui/AppShell'

/**
 * Shell for the three main tabs (Library, Record, Account). Renders the fixed
 * bottom TabBar and enables swipe navigation between tabs.
 */
export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <AppShell>{children}</AppShell>
}
