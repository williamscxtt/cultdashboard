'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { Profile } from '@/lib/types'
import { Card, Badge, Button, StatCard, PageHeader, EmptyState } from '@/components/ui'
import { Users } from 'lucide-react'

interface Props {
  clients: Profile[]
  totalClients: number
  activeClients: number
}

export default function AdminOverview({ clients, totalClients, activeClients }: Props) {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.ig_username?.toLowerCase().includes(q)
    )
  })

  function onClientAdded(_client: Profile) {
    window.location.reload()
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      <PageHeader
        title="Clients"
        description="Manage and view your clients' dashboards"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Badge variant="accent">{totalClients}</Badge>
            <Button size="sm" onClick={() => setShowModal(true)}>+ Add Client</Button>
          </div>
        }
      />

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Clients" value={totalClients} />
        <StatCard label="Active" value={activeClients} />
        <StatCard label="Scripts Generated" value="—" />
        <StatCard label="Avg Growth %" value="—" />
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, maxWidth: 320 }}>
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Client grid */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users size={20} />}
            title={search ? 'No results' : 'No clients yet'}
            description={search ? 'No clients match your search.' : 'Add your first client to get started.'}
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {filtered.map(client => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}

      {showModal && (
        <AddClientModal
          onClose={() => setShowModal(false)}
          onSuccess={onClientAdded}
        />
      )}
    </div>
  )
}

function ClientCard({ client }: { client: Profile }) {
  const [inviteState, setInviteState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [showSetPw, setShowSetPw] = useState(false)
  const [tempPw, setTempPw] = useState('')
  const [pwState, setPwState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [pwError, setPwError] = useState('')

  async function handleInvite() {
    if (!client.email) return
    setInviteState('loading')
    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: client.email, name: client.name }),
    })
    setInviteState(res.ok ? 'done' : 'error')
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (tempPw.length < 8) { setPwError('Min 8 characters'); return }
    setPwState('loading'); setPwError('')
    const res = await fetch('/api/admin/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: client.id, password: tempPw }),
    })
    const data = await res.json()
    if (!res.ok) { setPwError(data.error || 'Failed'); setPwState('error'); return }
    setPwState('done')
  }

  return (
    <Card style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'var(--foreground)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: 'var(--background)', flexShrink: 0,
          }}>
            {client.name ? client.name[0].toUpperCase() : (client.email ?? '?')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{client.name || 'Unnamed'}</div>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{client.email}</div>
          </div>
        </div>
        <Badge variant={client.is_active ? 'success' : 'muted'}>
          {client.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      {/* Niche tag */}
      {(client.niche || (client.intro_structured as { specific_niche?: string } | null)?.specific_niche) && (
        <div style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
          {client.niche || (client.intro_structured as { specific_niche?: string } | null)?.specific_niche}
        </div>
      )}

      {/* Details */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 2, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Instagram</div>
          <div style={{ fontSize: 13, color: 'var(--foreground)', fontWeight: 500 }}>
            {client.ig_username ? `@${client.ig_username}` : '—'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 2, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Phase</div>
          <div style={{ fontSize: 13, color: 'var(--foreground)', fontWeight: 500 }}>
            {client.phase_number ? `Phase ${client.phase_number}` : '—'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 2, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Start Followers</div>
          <div style={{ fontSize: 13, color: 'var(--foreground)', fontWeight: 500 }}>
            {client.starting_followers?.toLocaleString() ?? '—'}
          </div>
        </div>
      </div>

      {inviteState === 'done' && (
        <div style={{ fontSize: 12, color: 'hsl(142 71% 45%)', fontWeight: 600 }}>
          ✓ Login details emailed
        </div>
      )}
      {inviteState === 'error' && (
        <div style={{ fontSize: 12, color: 'hsl(0 72% 51%)' }}>
          Failed to send. Check the email address.
        </div>
      )}

      {/* Set temp password inline form */}
      {showSetPw && pwState !== 'done' && (
        <form onSubmit={handleSetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            type="text"
            value={tempPw}
            onChange={e => setTempPw(e.target.value)}
            placeholder="New password (min 8 chars)"
            autoFocus
            style={{ fontSize: 13, fontFamily: 'inherit' }}
          />
          {pwError && <div style={{ fontSize: 11, color: 'hsl(0 72% 51%)' }}>{pwError}</div>}
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="submit" disabled={pwState === 'loading'} style={{
              flex: 1, height: 30, borderRadius: 5, fontSize: 12, fontWeight: 600,
              background: '#3B82F6', color: '#fff', border: 'none',
              cursor: pwState === 'loading' ? 'default' : 'pointer',
              opacity: pwState === 'loading' ? 0.6 : 1, fontFamily: 'inherit',
            }}>
              {pwState === 'loading' ? 'Setting…' : 'Set password'}
            </button>
            <button type="button" onClick={() => { setShowSetPw(false); setTempPw(''); setPwState('idle'); setPwError('') }} style={{
              height: 30, padding: '0 10px', borderRadius: 5, fontSize: 12,
              background: 'var(--muted)', color: 'var(--muted-foreground)',
              border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {pwState === 'done' && (
        <div style={{
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#22C55E', fontWeight: 600,
        }}>
          ✓ Password set to: <span style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{tempPw}</span>
          <span
            onClick={() => { setPwState('idle'); setTempPw(''); setShowSetPw(false) }}
            style={{ marginLeft: 10, color: 'var(--muted-foreground)', cursor: 'pointer', fontWeight: 400, fontSize: 11 }}
          >
            dismiss
          </span>
        </div>
      )}

      {/* CTAs */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleInvite}
          disabled={inviteState === 'loading'}
          style={{
            flex: 1, height: 34, borderRadius: 6, fontSize: 12, fontWeight: 600,
            background: 'var(--muted)', color: 'var(--foreground)',
            border: '1px solid var(--border)', cursor: inviteState === 'loading' ? 'default' : 'pointer',
            opacity: inviteState === 'loading' ? 0.6 : 1,
            transition: 'opacity 0.15s', fontFamily: 'inherit',
          }}
          onMouseEnter={e => { if (inviteState !== 'loading') (e.currentTarget as HTMLElement).style.opacity = '0.75' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = inviteState === 'loading' ? '0.6' : '1' }}
        >
          {inviteState === 'loading' ? 'Generating…' : inviteState === 'done' ? 'Regenerate link' : 'Get invite link'}
        </button>
        <button
          onClick={() => { setShowSetPw(v => !v); setPwState('idle'); setTempPw('') }}
          style={{
            height: 34, padding: '0 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            background: 'var(--muted)', color: 'var(--foreground)',
            border: '1px solid var(--border)', cursor: 'pointer',
            transition: 'opacity 0.15s', fontFamily: 'inherit',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.75' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
        >
          Set pw
        </button>
        <Link
          href={`/dashboard/clients/${client.id}`}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 34, borderRadius: 6, fontSize: 13, fontWeight: 600,
            background: 'var(--foreground)', color: 'var(--background)',
            textDecoration: 'none', transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.75' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
        >
          View →
        </Link>
      </div>
    </Card>
  )
}

interface AddClientModalProps {
  onClose: () => void
  onSuccess: (client: Profile) => void
}

function AddClientModal({ onClose, onSuccess }: AddClientModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [igUsername, setIgUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ tempPassword: string; emailSent?: boolean } | null>(null)
  const [copied, setCopied] = useState<'link' | 'pass' | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, ig_username: igUsername }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Failed to create client')
      setLoading(false)
      return
    }

    setResult({ tempPassword: data.tempPassword, emailSent: data.emailSent ?? false })
    setLoading(false)

    onSuccess({
      id: data.userId,
      role: 'client',
      name,
      email,
      is_active: true,
      ig_username: igUsername || null,
      ig_user_id: null,
      ig_access_token: null,
      followers_count: null,
      yt_channel_id: null,
      tiktok_handle: null,
      onboarding_completed: false,
      created_at: new Date().toISOString(),
      niche: null, bio: null, coaching_phase: null, monthly_revenue: null,
      revenue_goal: null, target_audience: null, posts_per_week: null,
      content_pillars: null, ninety_day_goal: null, focus_this_week: null,
      biggest_challenge: null, why_joined: null, dm_goal: null,
      phase_number: null, date_joined: null, starting_followers: null,
      starting_avg_views: null, starting_revenue: null,
      ninety_day_follower_goal: null, ninety_day_revenue_goal: null,
      starting_active_clients: null, intro_structured: null,
      intro_freeform: null, intro_insights: null, dashboard_bio: null,
      weekly_checklist: null, onboarding_hub_complete: false,
      user_type: null, creator_style: null,
    })
  }

  async function copy() {
    const text = result?.tempPassword
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopied('pass')
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <Card style={{ padding: 28, width: '100%', maxWidth: 440, position: 'relative' }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'transparent', border: 'none',
            color: 'var(--muted-foreground)', cursor: 'pointer', padding: 4,
            fontSize: 18, lineHeight: 1,
          }}
        >
          ×
        </button>

        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)', marginBottom: 20 }}>Add New Client</h2>

        {result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.25)',
              borderRadius: 8, padding: '12px 14px',
            }}>
              <div style={{ fontSize: 13, color: '#22C55E', fontWeight: 700, marginBottom: 4 }}>
                ✓ Client created{result.emailSent ? ' — login details emailed!' : '!'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                {result.emailSent
                  ? `Login credentials have been sent to ${email}.`
                  : `Email not sent — share the temp password below directly.`}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>
                Temporary password
              </div>
              <div style={{ marginTop: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <code style={{
                    flex: 1, display: 'block', background: 'var(--muted)',
                    border: '1px solid var(--border)',
                    padding: '8px 10px', borderRadius: 6,
                    fontSize: 13, color: 'var(--foreground)',
                    fontFamily: 'monospace', wordBreak: 'break-all',
                  }}>
                    {result.tempPassword}
                  </code>
                  <button
                    onClick={copy}
                    style={{
                      flexShrink: 0, padding: '8px 12px', borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'var(--muted)', color: 'var(--foreground)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      whiteSpace: 'nowrap', fontFamily: 'inherit',
                    }}
                  >
                    {copied === 'pass' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            <Button onClick={onClose} style={{ width: '100%', marginTop: 4 }}>Done</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>Full Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>Email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="client@example.com" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>Instagram Handle</label>
              <input type="text" value={igUsername} onChange={e => setIgUsername(e.target.value)} placeholder="handle (without @)" />
            </div>
            {error && (
              <div style={{ background: 'hsl(0 50% 96%)', border: '1px solid hsl(0 70% 90%)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'hsl(0 72% 51%)' }}>
                {error}
              </div>
            )}
            <Button type="submit" disabled={loading} style={{ width: '100%', marginTop: 4 }}>
              {loading ? 'Creating...' : 'Create Client'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}
