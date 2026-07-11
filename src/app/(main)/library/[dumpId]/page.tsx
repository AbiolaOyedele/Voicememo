/**
 * Dump detail view.
 * Placeholder — full UI (clean/raw toggle) built in Step 18.
 */
export default async function DumpDetailPage({ params }: { params: Promise<{ dumpId: string }> }) {
  const { dumpId } = await params
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <p className="text-muted">Dump {dumpId} — detail view coming in Step 18.</p>
    </main>
  )
}
