'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import { Card, Badge, Button, PageHeader, EmptyState } from '@/components/ui'
import { Users, Grid3X3, Table2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface ClientHealth {
  profileId: string
  status: 'green' | 'amber' | 'red' | 'unknown'
  reason: string
}

interface Props {
  initialClients: Profile[]
}

const healthColor = {
  green: { bg: 'hsl(142 50% 95%)', border: 'hsl(142 50% 80%)', dot: 'hsl(142 71% 45%)', text: 'hsl(142 71% 30%)', label: 'On Track' },
  amber: { bg: 'hsl(38 90% 95%)', border: 'hsl(38 90% 75%)', dot: 'hsl(38 92% 50%)', text: 'hsl(38 80% 35%)', label: 'Slipping' },
  red: { bg: 'hsl(0 50% 96%)', border: 'hsl(0 70% 85%)', dot: 'hsl(0 72% 51%)', text: 'hsl(0 72% 40%)', label: 'At Risk' },
  unknown: { bg: 'var(--muted)', border: 'var(--border)', dot: 'var(--muted-foreground)', text: 'var(--muted-foreground)', label: 'No Data' },
}

export default function ClientsManager({ initialClients }: Props) {
  const [clients, setClients] = useState(initialClients)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [view, setView] = useState<'table' | 'heatmap'>('table')
  const [healthData, setHealthData] = useState<Record<string, ClientHealth>>({})

  useEffect(() => {
    if (view === 'heatmap') {
      fetch('/api/reports?all=true')
        .then(r => r.json())
        .then(data => {
          if (data.health) {
            const map: Record<string, ClientHealth> = {}
            data.health.forEach((h: ClientHealth) => { map[h.profileId] = h })
            setHealthData(map)
          }
        })
        .catch(() => {})
    }
  }, [view])

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.ig_username?.toLowerCase().includes(q)
    )
  })

  const atRisk = clients.filter(c => healthData[c.id]?.status === 'red').length
  const slipping = clients.filter(c => healthData[c.id]?.status === 'amber').length

  async function toggleActive(client: Profile) {
    const supabase = createClient()
    const newVal = !client.is_active
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: newVal })
      .eq('id', client.id)

    if (error) {
      toast.error(error.message)
    } else {
      setClients(prev => prev.map(c => c.id === client.id ? { ...c, is_active: newVal } : c))
      toast.success(`${client.name || client.email} ${newVal ? 'activated' : 'deactivated'}`)
    }
  }

  function onClientAdded(client: Profile) {
    setClients(prev => [client, ...prev])
    setShowModal(false)
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1024, margin: '0 auto' }}>
      <PageHeader
        title="Clients"
        description="Manage client accounts and access their dashboards."
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Badge variant="accent">{clients.length}</Badge>
            <Button size="sm" onClick={() => setShowModal(true)}>+ Add Client</Button>
          </div>
        }
      />

      {/* Alert strip */}
      {(atRisk > 0 || slipping > 0) && (
        <div style={{
          display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap',
        }}>
          {atRisk > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'hsl(0 50% 96%)', border: '1px solid hsl(0 70% 85%)',
              borderRadius: 8, padding: '6px 12px', fontSize: 12, color: 'hsl(0 72% 40%)', fontWeight: 600,
            }}>
              <AlertTriangle size={13} />
              {atRisk} client{atRisk > 1 ? 's' : ''} at risk — hasn&apos;t posted in 5+ days
            </div>
          )}
          {slipping > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'hsl(38 90% 95%)', border: '1px solid hsl(38 90% 75%)',
              borderRadius: 8, padding: '6px 12px', fontSize: 12, color: 'hsl(38 80% 35%)', fontWeight: 600,
            }}>
              <AlertTriangle size={13} />
              {slipping} client{slipping > 1 ? 's' : ''} slipping — declining engagement
            </div>
          )}
        </div>
      )}

      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <div style={{ display: 'flex', gap: 2, marginLeft: 'auto', background: 'var(--muted)', borderRadius: 8, padding: 3 }}>
          {([['table', Table2], ['heatmap', Grid3X3]] as const).map(([v, Icon]) => (
            <button key={v} onClick={() => setView(v)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 6, border: 'none',
              background: view === v ? 'var(--card)' : 'transparent',
              color: view === v ? 'var(--foreground)' : 'var(--muted-foreground)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.1s',
            }}>
              <Icon size={13} />
              {v === 'table' ? 'Table' : 'Heatmap'}
            </button>
          ))}
        </div>
      </div>

      {/* Heatmap view */}
      {view === 'heatmap' && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 12 }}>
            Color = client health based on latest weekly report. Generate reports to populate.
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 10,
          }}>
            {filtered.map(client => {
              const h = healthData[client.id]
              const status = h?.status ?? 'unknown'
              const colors = healthColor[status]
              return (
                <Link key={client.id} href={`/dashboard/clients/${client.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 10, padding: '14px 14px 12px',
                    cursor: 'pointer', transition: 'opacity 0.1s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.8' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'var(--foreground)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: 'var(--background)',
                      }}>
                        {(client.name || client.email || '?')[0].toUpperCase()}
                      </div>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: colors.dot, display: 'block',
                      }} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {client.name || 'Unnamed'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {client.ig_username ? `@${client.ig_username}` : client.email}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: colors.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {colors.label}
                    </div>
                    {h?.reason && (
                      <div style={{ fontSize: 10, color: colors.text, marginTop: 3, opacity: 0.8 }}>{h.reason}</div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Table view */}
      {view === 'table' && <Card style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Name', 'Niche', 'Instagram', 'Joined', 'Status', 'Actions'].map(h => (
                <th key={h} style={{
                  padding: '10px 16px', textAlign: 'left',
                  fontSize: 11, color: 'var(--muted-foreground)',
                  fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.06em', whiteSpace: 'nowrap',
                  borderBottom: '1px solid var(--border)',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon={<Users size={18} />}
                    title={search ? 'No results' : 'No clients yet'}
                    description={search ? 'No clients match your search.' : 'Add your first client to get started.'}
                  />
                </td>
              </tr>
            ) : (
              filtered.map(client => (
                <ClientRow key={client.id} client={client} onToggleActive={toggleActive} />
              ))
            )}
          </tbody>
        </table>
      </Card>}

      {showModal && (
        <AddClientModal
          onClose={() => setShowModal(false)}
          onSuccess={onClientAdded}
        />
      )}
    </div>
  )
}

function ClientRow({ client, onToggleActive }: { client: Profile; onToggleActive: (c: Profile) => void }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'hsl(0 0% 96% / 0.5)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'var(--foreground)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: 'var(--background)', flexShrink: 0,
          }}>
            {client.name ? client.name[0].toUpperCase() : (client.email ?? '?')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{client.name || 'Unnamed'}</div>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{client.email}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted-foreground)' }}>—</td>
      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted-foreground)' }}>
        {client.ig_username ? `@${client.ig_username}` : '—'}
      </td>
      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted-foreground)' }}>
        {new Date(client.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <button
          onClick={() => onToggleActive(client)}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
        >
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
            background: client.is_active ? 'hsl(142 50% 95%)' : 'var(--muted)',
            color: client.is_active ? 'hsl(142 71% 35%)' : 'var(--muted-foreground)',
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
              background: client.is_active ? 'hsl(142 71% 45%)' : 'var(--muted-foreground)',
            }} />
            {client.is_active ? 'Active' : 'Inactive'}
          </span>
        </button>
      </td>
      <td style={{ padding: '12px 16px' }}>
        <Link
          href={`/dashboard/clients/${client.id}`}
          style={{
            fontSize: 13, fontWeight: 600, color: 'var(--accent)',
            textDecoration: 'none',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
        >
          View →
        </Link>
      </td>
    </tr>
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
      yt_channel_id: null,
      tiktok_handle: null,
      onboarding_completed: false,
      created_at: new Date().toISOString(),
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
            fontSize: 20, lineHeight: 1, fontFamily: 'inherit',
          }}
        >
          ×
        </button>

        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)', marginBottom: 20 }}>Add New Client</h2>

        {tempPassword ? (
          <div>
            <div style={{
              background: 'hsl(142 50% 95%)', border: '1px solid hsl(142 50% 85%)',
              borderRadius: 8, padding: 16, marginBottom: 16,
            }}>
              <div style={{ fontSize: 13, color: 'hsl(142 71% 35%)', fontWeight: 600, marginBottom: 8 }}>
                Client created successfully!
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 8 }}>
                Temporary password (share with client):
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <code style={{
                  flex: 1, display: 'block', background: 'var(--muted)',
                  border: '1px solid var(--border)',
                  padding: '8px 10px', borderRadius: 6,
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
