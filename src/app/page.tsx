import { redirect } from 'next/navigation'

/**
 * Root route. The app always lands on the Record tab, so `/` redirects there.
 */
export default function RootPage() {
  redirect('/record')
}
