import { getPushSubscriberCount } from '@/services/admin.service'
import { PushBroadcaster } from '@/components/features/admin/PushBroadcaster'

export const dynamic = 'force-dynamic'

export default async function HumptyMarketing() {
  const subscriberCount = await getPushSubscriberCount()

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-muted text-xs font-medium tracking-wide uppercase">Send a push</h2>
      <PushBroadcaster subscriberCount={subscriberCount} />
    </div>
  )
}
