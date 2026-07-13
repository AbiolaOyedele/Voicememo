import { AdminShell } from '@/components/features/admin/AdminShell'

// Never cached — the shell fetches live data client-side per panel.
export const dynamic = 'force-dynamic'

export default function HumptyPage() {
  return <AdminShell />
}
