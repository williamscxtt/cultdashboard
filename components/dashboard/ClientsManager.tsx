'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import { Card, Badge, Button, PageHeader, EmptyState, StatCard } from '@/components/ui'
import { Users, Grid3X3, Table2, AlertTriangle, LayoutGrid, Mail, RefreshCw, CreditCard } from 'lucide-react'
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
  green: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)', dot: 'hsl(142 71% 45%)', text: 'hsl(142 71% 45%)', label: 'On Track' },
  amber: { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.35)', dot: 'hsl(43 96% 56%)', text: 'hsl(43 96% 56%)', label: 'Slipping' },
  red: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', dot: 'hsl(0 84% 60%)', text: 'hsl(0 84% 60%)', label: 'At Risk' },
  unknown: { bg: 'var(--muted)', border: 'var(--border)', dot: 'var(--muted-foreground)', text: 'var(--muted-foreground)', label: 'No Data' },
}

export default function ClientsManager({ initialClients }: Props) {
  const [clients, setClients] = useState(initialClients)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [view, setView] = useState<'cards' | 'table' | 'heatmap'>('cards')
  const [healthData, setHealthData] = useState<Record<string, ClientHealth>>({})
  const [syncingAll, setSyncingAll] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)

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
  const activeCount = clients.filter(c => c.is_active).length
  const igConnected = clients.filter(c => c.ig_username).length

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

  async function toggleBillingExempt(client: Profile) {
    const supabase = createClient()
    const newVal = !client.billing_exempt
    const { error } = await supabase
      .from('profiles')
      .update({ billing_exempt: newVal })
      .eq('id', client.id)

    if (error) {
      toast.error(error.message)
    } else {
      setClients(prev => prev.map(c => c.id === client.id ? { ...c, billing_exempt: newVal } : c))
      toast.success(`${client.name || client.email}: ${newVal ? 'set to free account' : 'set to paid account'}`)
    }
  }

  function onClientAdded(client: Profile) {
    setClients(prev => [client, ...prev])
    setShowModal(false)
  }

  async function sendInvite(email: string, name?: string | null, force = false) {
    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, force }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(`Error: ${data.error || res.status}`)
        return
      }
      if (data.skipped) {
        // Already active — offer to force-resend if they need a new password
        toast(`${name || email} already has an active account. Use the password reset in their profile if they need access.`, {
          duration: 5000,
          icon: '✓',
        })
        return
      }
      if (data.emailSent) {
        toast.success(`Login details sent to ${name || email}`)
      } else {
        toast.error(`Couldn't send email — temp password: ${data.tempPassword}`)
      }
    } catch {
      toast.error(`Network error sending invite`)
    }
  }

  async function syncIG(client: Profile) {
    setSyncingId(client.id)
    try {
      const res = await fetch('/api/instagram/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: client.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(`${client.name || client.email}: ${data.error || res.status}`)
      } else {
        const followers = data.followers ? ` · ${data.followers.toLocaleString()} followers` : ''
        toast.success(`${client.name || client.email}: ${data.synced} new reels${followers}`)
        if (data.followers) {
          setClients(prev => prev.map(c => c.id === client.id ? { ...c, followers_count: data.followers } : c))
        }
      }
    } catch {
      toast.error(`Network error syncing ${client.name || client.email}`)
    } finally {
      setSyncingId(null)
    }
  }

  async function syncAllIG() {
    const toSync = clients.filter(c => c.is_active && c.ig_username)
    if (toSync.length === 0) { toast.error('No active clients with Instagram usernames'); return }
    setSyncingAll(true)
    let done = 0
    let errors = 0
    toast.loading(`Syncing Instagram (0/${toSync.length})…`, { id: 'sync-all' })
    for (const client of toSync) {
      setSyncingId(client.id)
      try {
        const res = await fetch('/api/instagram/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId: client.id }),
        })
        const data = await res.json()
        done++
        if (!res.ok) {
          errors++
          console.error(`Sync failed for ${client.ig_username}:`, data.error)
        } else if (data.followers) {
          setClients(prev => prev.map(c => c.id === client.id ? { ...c, followers_count: data.followers } : c))
        }
      } catch {
        errors++
      }
      toast.loading(`Syncing Instagram (${done}/${toSync.length})…`, { id: 'sync-all' })
    }
    setSyncingId(null)
    setSyncingAll(false)
    toast.dismiss('sync-all')
    if (errors > 0) {
      toast.success(`Synced ${done - errors}/${toSync.length} accounts (${errors} failed — check console)`)
    } else {
      toast.success(`All ${toSync.length} Instagram accounts synced`)
    }
  }

  async function sendAllInvites() {
    const activeClients = clients.filter(c => c.is_active && c.email)
    if (activeClients.length === 0) { toast.error('No active clients with emails'); return }
    toast.loading(`Sending invites to ${activeClients.length} clients…`, { id: 'bulk-invite' })
    let sent = 0
    let skipped = 0
    let failed = 0
    for (const client of activeClients) {
      try {
        const res = await fetch('/api/admin/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: client.email, name: client.name }),
        })
        const data = await res.json()
        if (!res.ok) {
          failed++
        } else if (data.skipped) {
          skipped++ // already active — don't reset their password
        } else if (data.emailSent) {
          sent++
        } else {
          failed++ // email failed to send
        }
      } catch {
        failed++
      }
    }
    toast.dismiss('bulk-invite')
    const parts: string[] = []
    if (sent > 0) parts.push(`${sent} invite${sent > 1 ? 's' : ''} sent`)
    if (skipped > 0) parts.push(`${skipped} already active (skipped)`)
    if (failed > 0) parts.push(`${failed} failed`)
    if (parts.length === 0) parts.push('Nothing to do')
    if (sent > 0 || skipped > 0) {
      toast.success(parts.join(' · '))
    } else {
      toast.error(parts.join(' · '))
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1024, margin: '0 auto' }}>
      <PageHeader
        title="Clients"
        description="Manage client accounts and access their dashboards."
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge variant="accent">{clients.length}</Badge>
            <Button size="sm" variant="secondary" onClick={sendAllInvites} style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              <Mail size={12} /> Invite all
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={syncAllIG}
              disabled={syncingAll}
              style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', opacity: syncingAll ? 0.6 : 1 }}
            >
              <RefreshCw size={12} style={syncingAll ? { opacity: 0.5 } : {}} />
              {syncingAll ? 'Syncing…' : 'Sync all IG'}
            </Button>
            <Button size="sm" onClick={() => setShowModal(true)}>+ Add Client</Button>
          </div>
        }
      />

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Total Clients" value={clients.length} />
        <StatCard label="Active" value={activeCount} />
        <StatCard label="IG Connected" value={igConnected} />
        <StatCard label="At Risk" value={atRisk} />
      </div>

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
              background: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.35)',
              borderRadius: 8, padding: '6px 12px', fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 600,
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
          {([['cards', LayoutGrid, 'Cards'], ['table', Table2, 'Table'], ['heatmap', Grid3X3, 'Heatmap']] as const).map(([v, Icon, label]) => (
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
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards view */}
      {view === 'cards' && (
        filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Users size={20} />}
              title={search ? 'No results' : 'No clients yet'}
              description={search ? 'No clients match your search.' : 'Add your first client to get started.'}
            />
          </Card>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {filtered.map(client => (
              <ClientCard key={client.id} client={client} onToggleActive={toggleActive} onToggleBillingExempt={toggleBillingExempt} onSendInvite={sendInvite} />
            ))}
          </div>
        )
      )}

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
              {['Name', 'Niche', 'Instagram', 'Followers', 'Joined', 'Status', 'Actions'].map(h => (
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
                <td colSpan={7}>
                  <EmptyState
                    icon={<Users size={18} />}
                    title={search ? 'No results' : 'No clients yet'}
                    description={search ? 'No clients match your search.' : 'Add your first client to get started.'}
                  />
                </td>
              </tr>
            ) : (
              filtered.map(client => (
                <ClientRow key={client.id} client={client} onToggleActive={toggleActive} onToggleBillingExempt={toggleBillingExempt} onSendInvite={sendInvite} onSyncIG={syncIG} isSyncing={syncingId === client.id} />
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

function ClientRow({ client, onToggleActive, onToggleBillingExempt, onSendInvite, onSyncIG, isSyncing }: {
  client: Profile
  onToggleActive: (c: Profile) => void
  onToggleBillingExempt: (c: Profile) => void
  onSendInvite: (email: string, name?: string | null) => void
  onSyncIG: (c: Profile) => void
  isSyncing: boolean
}) {
  const [inviting, setInviting] = useState(false)
  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
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
      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted-foreground)', maxWidth: 180 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {client.niche || (client.intro_structured as { specific_niche?: string } | null)?.specific_niche || '—'}
        </div>
      </td>
      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted-foreground)' }}>
        {client.ig_username ? `@${client.ig_username}` : '—'}
      </td>
      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--foreground)', fontWeight: 500 }}>
        {client.followers_count ? client.followers_count.toLocaleString() : '—'}
      </td>
      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted-foreground)' }}>
        {client.date_joined
          ? new Date(client.date_joined).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : new Date(client.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'nowrap' }}>
          <button
            onClick={() => onToggleActive(client)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', flexShrink: 0 }}
          >
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
              fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
              background: client.is_active ? 'rgba(34,197,94,0.12)' : 'var(--muted)',
              color: client.is_active ? 'hsl(142 71% 45%)' : 'var(--muted-foreground)',
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                background: client.is_active ? 'hsl(142 71% 45%)' : 'var(--muted-foreground)',
              }} />
              {client.is_active ? 'Active' : 'Inactive'}
            </span>
          </button>
          <button
            onClick={() => onToggleBillingExempt(client)}
            title={client.billing_exempt ? 'Free account — click to require subscription' : 'Paid account — click to mark as free'}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', flexShrink: 0 }}
          >
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
              fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 999,
              background: client.billing_exempt ? 'rgba(139,92,246,0.12)' : 'rgba(59,130,246,0.08)',
              color: client.billing_exempt ? '#a78bfa' : 'rgba(59,130,246,0.5)',
            }}>
              <CreditCard size={9} />
              {client.billing_exempt ? 'Free' : '£50/mo'}
            </span>
          </button>
        </div>
      </td>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {client.ig_username && (
            <button
              onClick={() => onSyncIG(client)}
              disabled={isSyncing}
              title="Sync Instagram data"
              style={{
                display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', flexShrink: 0,
                padding: '4px 10px', borderRadius: 5, border: '1px solid var(--border)',
                background: 'transparent', cursor: isSyncing ? 'wait' : 'pointer',
                color: 'var(--muted-foreground)', fontSize: 11, fontFamily: 'inherit',
                opacity: isSyncing ? 0.5 : 1,
              }}
            >
              <RefreshCw size={11} style={isSyncing ? { opacity: 0.5 } : {}} />
              {isSyncing ? '…' : 'Sync'}
            </button>
          )}
          <button
            onClick={async () => {
              if (!client.email) return
              setInviting(true)
              await onSendInvite(client.email, client.name)
              setInviting(false)
            }}
            disabled={inviting || !client.email}
            title="Send login invite email"
            style={{
              display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', flexShrink: 0,
              padding: '4px 10px', borderRadius: 5, border: '1px solid var(--border)',
              background: 'transparent', cursor: inviting ? 'wait' : 'pointer',
              color: 'var(--muted-foreground)', fontSize: 11, fontFamily: 'inherit',
              opacity: inviting ? 0.5 : 1,
            }}
          >
            <Mail size={11} />
            {inviting ? '…' : 'Invite'}
          </button>
          <Link
            href={`/dashboard/clients/${client.id}`}
            style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
          >
            View →
          </Link>
        </div>
      </td>
    </tr>
  )
}

/** Deterministic avatar colour from name/email string */
function avatarBg(str: string): string {
  const palette = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316']
  const sum = [...(str || '?')].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return palette[sum % palette.length]
}

function ClientCard({ client, onToggleActive, onToggleBillingExempt, onSendInvite }: { client: Profile; onToggleActive: (c: Profile) => void; onToggleBillingExempt: (c: Profile) => void; onSendInvite: (email: string, name?: string | null) => void }) {
  const [inviting, setInviting] = useState(false)
  const [showSetPw, setShowSetPw] = useState(false)
  const [tempPw, setTempPw] = useState('')
  const [pwState, setPwState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [pwError, setPwError] = useState('')
  const niche = client.niche || (client.intro_structured as { specific_niche?: string } | null)?.specific_niche
  const displayName = client.name || 'Unnamed'
  const initial = (client.name || client.email || '?')[0].toUpperCase()
  const joined = new Date(client.date_joined ?? client.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

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
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transition: 'border-color 0.15s',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(59,130,246,0.35)' }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
    >
      {/* ── Card body ── */}
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>

        {/* Header: avatar + name/email + badges */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {/* Avatar */}
          <div style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            background: avatarBg(client.name || client.email || ''),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 800, color: '#fff',
            letterSpacing: '-0.02em',
          }}>
            {initial}
          </div>

          {/* Name + email */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.3, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {client.email || '—'}
            </div>
          </div>

          {/* Status badges — stacked vertically on the right */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
            {/* Active / Inactive toggle */}
            <button
              onClick={() => onToggleActive(client)}
              title="Toggle active status"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
            >
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 999,
                background: client.is_active ? 'rgba(34,197,94,0.12)' : 'var(--muted)',
                color: client.is_active ? 'hsl(142 71% 45%)' : 'var(--muted-foreground)',
                border: `1px solid ${client.is_active ? 'rgba(34,197,94,0.25)' : 'var(--border)'}`,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: client.is_active ? 'hsl(142 71% 45%)' : 'var(--muted-foreground)', flexShrink: 0 }} />
                {client.is_active ? 'Active' : 'Inactive'}
              </span>
            </button>

            {/* Billing toggle */}
            <button
              onClick={() => onToggleBillingExempt(client)}
              title={client.billing_exempt ? 'Free account — click to require subscription' : 'Paying £50/mo — click to mark as free'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
            >
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 999,
                background: client.billing_exempt ? 'rgba(139,92,246,0.12)' : 'rgba(59,130,246,0.1)',
                color: client.billing_exempt ? '#a78bfa' : '#60a5fa',
                border: `1px solid ${client.billing_exempt ? 'rgba(139,92,246,0.25)' : 'rgba(59,130,246,0.25)'}`,
              }}>
                <CreditCard size={10} />
                {client.billing_exempt ? 'Free' : '£50/mo'}
              </span>
            </button>
          </div>
        </div>

        {/* Niche — 2-line clamp */}
        {niche ? (
          <div style={{
            fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.55,
            display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden',
          }}>
            {niche}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', fontStyle: 'italic', opacity: 0.5 }}>No niche set</div>
        )}

        {/* Stats — always 3 columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            {
              label: 'Instagram',
              value: client.ig_username ? `@${client.ig_username}` : '—',
              mono: !!client.ig_username,
            },
            {
              label: 'Phase',
              value: client.phase_number ? `Phase ${client.phase_number}` : '—',
            },
            {
              label: client.followers_count ? 'Followers' : 'Joined',
              value: client.followers_count ? client.followers_count.toLocaleString() : joined,
            },
          ].map(({ label, value, mono }) => (
            <div key={label} style={{
              background: 'var(--muted)', borderRadius: 7, padding: '8px 10px',
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)', marginBottom: 4 }}>
                {label}
              </div>
              <div style={{
                fontSize: 12, fontWeight: 600, color: 'var(--foreground)',
                fontFamily: mono ? 'monospace' : 'inherit',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Set password form */}
        {showSetPw && pwState !== 'done' && (
          <form onSubmit={handleSetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
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
            ✓ Password set:{' '}
            <span style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{tempPw}</span>
            <span
              onClick={() => { setPwState('idle'); setTempPw(''); setShowSetPw(false) }}
              style={{ marginLeft: 10, color: 'var(--muted-foreground)', cursor: 'pointer', fontWeight: 400, fontSize: 11 }}
            >
              dismiss
            </span>
          </div>
        )}
      </div>

      {/* ── Action footer — always at bottom ── */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '10px 14px',
        display: 'flex', gap: 8, alignItems: 'center',
        background: 'rgba(0,0,0,0.15)',
      }}>
        {/* Send invite */}
        <button
          onClick={async () => {
            if (!client.email) return
            setInviting(true)
            await onSendInvite(client.email, client.name)
            setInviting(false)
          }}
          disabled={inviting || !client.email}
          title="Send login credentials email"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            height: 30, padding: '0 12px', borderRadius: 6,
            fontSize: 12, fontWeight: 600, flexShrink: 0,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--muted-foreground)', cursor: inviting ? 'wait' : 'pointer',
            fontFamily: 'inherit', opacity: inviting ? 0.5 : 1,
            transition: 'background 0.12s, color 0.12s',
          }}
          onMouseEnter={e => { if (!inviting) { (e.currentTarget as HTMLElement).style.background = 'var(--muted)'; (e.currentTarget as HTMLElement).style.color = 'var(--foreground)' } }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)' }}
        >
          <Mail size={12} />
          {inviting ? 'Sending…' : 'Invite'}
        </button>

        {/* Set password */}
        <button
          onClick={() => { setShowSetPw(v => !v); setPwState('idle'); setTempPw('') }}
          title="Set a custom password for this client"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            height: 30, padding: '0 12px', borderRadius: 6,
            fontSize: 12, fontWeight: 600, flexShrink: 0,
            border: '1px solid var(--border)', background: showSetPw ? 'var(--muted)' : 'transparent',
            color: showSetPw ? 'var(--foreground)' : 'var(--muted-foreground)',
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'background 0.12s, color 0.12s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--muted)'; (e.currentTarget as HTMLElement).style.color = 'var(--foreground)' }}
          onMouseLeave={e => { if (!showSetPw) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)' } }}
        >
          Set password
        </button>

        {/* View dashboard — fills remaining space */}
        <Link
          href={`/dashboard/clients/${client.id}`}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            flex: 1, height: 30, borderRadius: 6,
            fontSize: 12, fontWeight: 700,
            background: 'rgba(59,130,246,0.1)',
            color: '#60a5fa',
            border: '1px solid rgba(59,130,246,0.2)',
            textDecoration: 'none', transition: 'background 0.12s, color 0.12s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#3b82f6'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.1)'; (e.currentTarget as HTMLElement).style.color = '#60a5fa' }}
        >
          Open dashboard →
        </Link>
      </div>
    </div>
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
      weekly_checklist: null, onboarding_hub_complete: false,
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
