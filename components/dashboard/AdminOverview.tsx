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

  function onClientAdded(client: Profile) {
    // Reload page to show new client
    window.location.reload()
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1024, margin: '0 auto' }}>
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

      {/* CTA */}
      <Link
        href={`/dashboard/clients/${client.id}`}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: 34, borderRadius: 6, fontSize: 13, fontWeight: 600,
          background: 'var(--muted)', color: 'var(--foreground)',
          textDecoration: 'none', transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.75' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
      >
        View →
      </Link>
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
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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

    setTempPassword(data.tempPassword)
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
      weekly_checklist: null,
    })
  }

  async function copyPassword() {
    if (!tempPassword) return
    await navigator.clipboard.writeText(tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <Card style={{ padding: 28, width: '100%', maxWidth: 420, position: 'relative' }}>
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

        {tempPassword ? (
          <div>
            <div style={{
              background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.5)',
              borderRadius: 8, padding: 16, marginBottom: 16,
            }}>
              <div style={{ fontSize: 13, color: '#3B82F6', fontWeight: 600, marginBottom: 8 }}>
                Client created successfully!
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 8 }}>
                Temporary password (share with client):
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <code style={{
                  flex: 1, display: 'block', background: 'var(--muted)',
                  border: '1px solid var(--border)',
                  padding: '8px 12px', borderRadius: 6,
                  fontSize: 13, color: 'var(--foreground)',
                  fontFamily: 'monospace', wordBreak: 'break-all',
                }}>
                  {tempPassword}
                </code>
                <button
                  onClick={copyPassword}
                  style={{
                    padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)',
                    background: 'var(--muted)', color: 'var(--foreground)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                    fontFamily: 'inherit',
                  }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <Button onClick={onClose} style={{ width: '100%' }}>Done</Button>
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
