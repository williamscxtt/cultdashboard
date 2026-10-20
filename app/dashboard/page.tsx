import { redirect } from 'next/navigation'

export default function DashboardPage() {
  // The proxy and parent layout validate the session and current access.
  // Everyone lands on their own analytics dashboard
  redirect('/dashboard/analytics')
}
