import Link from 'next/link'
import { getOptionalUser } from '@/middleware/auth'
import { SignOutButton } from '@/components/features/account/SignOutButton'

/** Read a string field from Supabase user metadata safely. */
function metaString(meta: Record<string, unknown> | undefined, key: string): string | null {
  const value = meta?.[key]
  return typeof value === 'string' ? value : null
}

export default async function AccountPage() {
  const user = await getOptionalUser()

  if (!user) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-6">
        <h1 className="px-1 text-2xl font-bold tracking-tight">Account</h1>
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-muted text-sm">You are browsing as a guest.</p>
          <Link
            href="/login"
            className="rounded-btn bg-flame inline-flex h-11 items-center px-5 font-medium text-white"
          >
            Sign in
          </Link>
        </div>
      </main>
    )
  }

  const name = metaString(user.user_metadata, 'full_name') ?? metaString(user.user_metadata, 'name')
  const email = user.email ?? null
  const initial = (name ?? email ?? '?').charAt(0).toUpperCase()

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 pt-6">
      <h1 className="px-1 text-2xl font-bold tracking-tight">Account</h1>

      <section className="flex items-center gap-4">
        <div className="bg-ink text-canvas flex h-14 w-14 items-center justify-center rounded-full text-xl font-semibold">
          {initial}
        </div>
        <div className="flex flex-col">
          {name ? <span className="text-lg font-semibold">{name}</span> : null}
          {email ? <span className="text-muted text-sm">{email}</span> : null}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-muted px-1 text-xs font-semibold tracking-wide uppercase">Settings</h2>
        <ul className="rounded-card divide-ink/10 border-ink/10 divide-y border">
          <SettingRow label="Notifications" hint="Coming soon" />
          <SettingRow label="Export your data" hint="Coming soon" />
          <SettingRow label="Delete account" hint="Coming soon" destructive />
        </ul>
      </section>

      <SignOutButton />
    </main>
  )
}

function SettingRow({
  label,
  hint,
  destructive = false,
}: {
  label: string
  hint: string
  destructive?: boolean
}) {
  return (
    <li className="flex items-center justify-between px-4 py-3.5">
      <span className={`text-[15px] ${destructive ? 'text-ink' : 'text-ink'}`}>{label}</span>
      <span className="text-muted text-xs">{hint}</span>
    </li>
  )
}
