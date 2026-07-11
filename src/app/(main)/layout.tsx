/**
 * Shell for the three main tabs (Record, Library, Account).
 * The fixed bottom TabBar and swipe navigation are added in Step 11.
 */
export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <div className="pb-safe flex min-h-full flex-1 flex-col">{children}</div>
}
