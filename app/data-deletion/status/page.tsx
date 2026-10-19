import { instagramAdmin } from '@/lib/instagram-connection'

export const metadata = { title: 'Instagram deletion status — CULT Dashboard' }
export default async function InstagramDeletionStatus({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams
  const { data } = code && /^[A-Za-z0-9_-]{32}$/.test(code)
    ? await instagramAdmin().from('instagram_deletion_receipts').select('completed_at').eq('confirmation_code', code).maybeSingle()
    : { data: null }
  return <main style={{ maxWidth: 640, margin: '0 auto', padding: 32 }}>
    <h1>Instagram data deletion</h1>
    <p>{data ? 'Completed. The connection and credentials received through Instagram Login have been deleted.' : 'No completed request was found for this confirmation code.'}</p>
    <p>To request deletion of your Dashboard account and separately supplied content, follow the <a href="/data-deletion">account deletion instructions</a>.</p>
  </main>
}
