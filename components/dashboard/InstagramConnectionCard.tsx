'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, SectionLabel, Badge } from '@/components/ui'
import { CheckCircle2, ShieldCheck } from 'lucide-react'

export type InstagramConnectionStatus = { username: string; expires_at: string; connected_at: string; status: string; last_checked_at: string | null; last_error: string | null } | null

const messages: Record<string, string> = {
  connected: 'Instagram connected. You can now check your official analytics.',
  cancelled: 'Connection cancelled. You can try again whenever you are ready.',
  invalid_state: 'That connection attempt expired. Please start again from here.',
  account_mismatch: 'Please connect the Instagram account that matches the username saved above.',
  missing_permissions: 'Instagram analytics access was not granted. Reconnect and allow both requested permissions.',
  connection_failed: 'Instagram could not connect. Please try again.',
  unauthorized: 'Please sign in again before connecting Instagram.',
}

export default function InstagramConnectionCard({ username, connection, result }: { username: string | null; connection: InstagramConnectionStatus; result?: string }) {
  const [checking, setChecking] = useState(false)
  const [report, setReport] = useState<{ username: string; followers: number | null; metrics: Record<string, { value: number | null; available: boolean }> } | null>(null)
  const [error, setError] = useState('')
  const [removing, setRemoving] = useState(false)
  const [removed, setRemoved] = useState(false)
  const router = useRouter()
  const connected = connection?.status === 'active' && !removed
  async function removeConnection() {
    setRemoving(true); setError('')
    try {
      const response = await fetch('/api/instagram/connection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'disconnect' }) })
      if (!response.ok) throw new Error('Could not remove the connection. Please try again.')
      setRemoved(true); setReport(null); router.refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.') }
    finally { setRemoving(false) }
  }
  async function checkAnalytics() {
    setChecking(true); setError(''); setReport(null)
    try {
      const response = await fetch('/api/instagram/test-insights', { cache: 'no-store' })
      if (!response.ok) throw new Error('Could not read Instagram analytics. Please reconnect or try again.')
      setReport(await response.json())
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.') }
    finally { setChecking(false) }
  }
  return <Card style={{ padding: 20, border: '1px solid rgba(214,181,92,0.35)' }}>
    <SectionLabel>Official Instagram analytics</SectionLabel>
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <ShieldCheck size={24} style={{ color: '#d6b55c', flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <strong style={{ fontSize: 14 }}>Connect directly with Instagram</strong>
          <Badge variant={connected ? 'success' : 'muted'}>{connected ? 'Connected' : 'Admin pilot'}</Badge>
        </div>
        <p style={{ color: 'var(--muted-foreground)', fontSize: 12, lineHeight: 1.65, margin: '8px 0 12px' }}>
          Read your profile and analytics through Meta. This connection only requests read access. Your daily public statistics continue to sync while we test the official numbers.
        </p>
        {result && messages[result] && <p role="status" style={{ fontSize: 12, marginBottom: 12 }}>{messages[result]}</p>}
        {connected && <p style={{ fontSize: 12, marginBottom: 12 }}><CheckCircle2 size={12} style={{ display: 'inline' }} /> @{connection.username} connected until {new Date(connection.expires_at).toLocaleDateString('en-GB')}</p>}
        {username ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <a href="/api/auth/instagram" style={{ display: 'inline-block', padding: '9px 14px', borderRadius: 8, background: '#d6b55c', color: '#111', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>{connected ? 'Reconnect Instagram' : 'Connect Instagram'}</a>
          {connected && <Button variant="secondary" size="sm" onClick={checkAnalytics} disabled={checking}>{checking ? 'Checking…' : 'Check official analytics'}</Button>}
          {connection && !removed && <Button variant="secondary" size="sm" onClick={removeConnection} disabled={removing}>{removing ? 'Removing…' : 'Remove Meta connection'}</Button>}
        </div> : <p style={{ fontSize: 12 }}>Save your Instagram username above before connecting.</p>}
        {error && <p role="alert" style={{ fontSize: 12, marginTop: 12 }}>{error}</p>}
        {removed && <p role="status" style={{ fontSize: 12, marginTop: 12 }}>The Meta connection was removed from your Dashboard. Your saved content and public statistics are preserved. You can also revoke authorisation in <a href="https://www.instagram.com/accounts/manage_access/" target="_blank" rel="noopener noreferrer">Instagram Apps and Websites</a>.</p>}
        {report && <div style={{ fontSize: 12, lineHeight: 1.8, marginTop: 16 }}>
          <strong>Official account analytics · last 30 days</strong>
          <div>Views: {report.metrics.views.available ? report.metrics.views.value?.toLocaleString('en-GB') : 'Unavailable from Instagram'}</div>
          <div>Accounts reached: {report.metrics.reach.available ? report.metrics.reach.value?.toLocaleString('en-GB') : 'Unavailable from Instagram'}</div>
          <div>Current followers: {report.followers?.toLocaleString('en-GB') ?? 'Unavailable from Instagram'}</div>
          <p style={{ color: 'var(--muted-foreground)', marginTop: 8 }}>These are views earned across your account during this period. The leaderboard currently counts public Reel plays on content posted during the period.</p>
        </div>}
      </div>
    </div>
  </Card>
}
