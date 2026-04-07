import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export default async function ContentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div style={{ padding: '32px 40px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Content</h1>
        <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
          Content strategy and ideas based on your performance data.
        </p>
      </div>

      <div style={{
        background: '#ffffff',
        border: '1px solid #e8eaed',
        borderRadius: 12,
        padding: '64px 48px',
        textAlign: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>💡</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
          Coming soon
        </div>
        <div style={{ fontSize: 14, color: '#6b7280', maxWidth: 360, margin: '0 auto' }}>
          Content ideas and pillars analysis will appear here once your reel data is connected.
          In the meantime, use{' '}
          <a href="/dashboard/ai" style={{ color: '#cc0000', textDecoration: 'none' }}>Ask Will AI</a>{' '}
          to get personalised content advice.
        </div>
      </div>
    </div>
  )
}
