'use client'

import { useState } from 'react'
import { Plus, Trash2, X, Save, ChevronRight } from 'lucide-react'
import { Card, Button, PageHeader } from '@/components/ui'
import { useIsMobile } from '@/lib/use-mobile'

// ─── types ────────────────────────────────────────────────────────────────────

interface Sale {
  id: string
  profile_id: string
  lead_name: string | null      // client name
  source: string | null         // what they bought / offer name
  deal_value: number | null     // sale amount
  date: string | null           // sale date (call_date repurposed)
  notes: string | null          // any notes
  stage: string | null          // 'Active' or 'Past'
  created_at: string
  updated_at: string
}

// ─── stat card ────────────────────────────────────────────────────────────────

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--foreground)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ─── sale form (new + edit) ───────────────────────────────────────────────────

function SaleForm({
  initial,
  onSave,
  onClose,
  title,
}: {
  initial: Partial<Sale>
  onSave: (data: Partial<Sale>) => Promise<void>
  onClose: () => void
  title: string
}) {
  const [form, setForm] = useState({
    lead_name:  initial.lead_name  ?? '',
    source:     initial.source     ?? '',
    deal_value: initial.deal_value != null ? String(initial.deal_value) : '',
    date:       initial.date       ?? new Date().toISOString().slice(0, 10),
    notes:      initial.notes      ?? '',
    stage:      initial.stage      ?? 'Active',
  })
  const [saving, setSaving] = useState(false)
  const isMobile = useIsMobile()

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 11px', fontSize: 13, boxSizing: 'border-box',
    background: 'var(--background)', border: '1px solid var(--border)',
    borderRadius: 7, color: 'var(--foreground)', fontFamily: 'inherit', outline: 'none',
  }
  const lbl = (t: string) => (
    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 4 }}>
      {t}
    </label>
  )

  function s(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({
        lead_name:  form.lead_name  || null,
        source:     form.source     || null,
        deal_value: form.deal_value ? Number(form.deal_value) : null,
        date:       form.date       || null,
        notes:      form.notes      || null,
        stage:      form.stage,
      })
    } finally { setSaving(false) }
  }

  return (
    <Card style={{ padding: 20, marginBottom: 16, borderColor: 'var(--accent)', borderWidth: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>{title}</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          {lbl('Client name')}
          <input style={inp} value={form.lead_name} onChange={s('lead_name')} placeholder="Jane Smith" />
        </div>
        <div>
          {lbl('What they bought')}
          <input style={inp} value={form.source} onChange={s('source')} placeholder="1:1 Coaching, Creator Cult, etc." />
        </div>
        <div>
          {lbl('Sale value (£)')}
          <input type="number" style={inp} value={form.deal_value} onChange={s('deal_value')} placeholder="2500" />
        </div>
        <div>
          {lbl('Date of sale')}
          <input type="date" style={{ ...inp, colorScheme: 'dark' }} value={form.date} onChange={s('date')} />
        </div>
        <div>
          {lbl('Status')}
          <select style={inp} value={form.stage} onChange={s('stage')}>
            <option value="Active">Active client</option>
            <option value="Past">Past client</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        {lbl('Notes')}
        <textarea
          rows={2}
          style={{ ...inp, resize: 'vertical' }}
          value={form.notes}
          onChange={s('notes')}
          placeholder="Anything useful to remember about this client or sale..."
        />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" disabled={saving || !form.lead_name.trim()} onClick={handleSave} style={{ gap: 6 }}>
          <Save size={13} /> {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Card>
  )
}

// ─── sale detail panel ────────────────────────────────────────────────────────

function SalePanel({ sale, onClose, onDelete, onEdit }: {
  sale: Sale
  onClose: () => void
  onDelete: (id: string) => void
  onEdit: () => void
}) {
  const isMobile = useIsMobile()

  const row = (label: string, value: string | null | undefined) => value ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5 }}>{value}</span>
    </div>
  ) : null

  return (
    <div style={{
      position: 'fixed',
      top: 0, right: 0, bottom: 0,
      width: isMobile ? '100%' : 380,
      left: isMobile ? 0 : 'auto',
      zIndex: 50,
      background: 'var(--card)',
      borderLeft: isMobile ? 'none' : '1px solid var(--border)',
      borderTop: isMobile ? '1px solid var(--border)' : 'none',
      overflowY: 'auto',
      padding: isMobile ? '16px 16px 40px' : 24,
      boxShadow: isMobile ? '0 -8px 32px rgba(0,0,0,0.25)' : '-8px 0 32px rgba(0,0,0,0.15)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--foreground)', marginBottom: 4 }}>
            {sale.lead_name || 'Client'}
          </div>
          {sale.source && (
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{sale.source}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onEdit} style={{ padding: '5px 10px', background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--foreground)', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
            Edit
          </button>
          <button onClick={() => { if (confirm('Delete this sale?')) onDelete(sale.id) }} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
            <Trash2 size={14} />
          </button>
          <button onClick={onClose} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
            <X size={16} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {sale.deal_value != null && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Sale value</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--foreground)' }}>£{sale.deal_value.toLocaleString()}</span>
          </div>
        )}
        {row('What they bought', sale.source)}
        {row('Date of sale', sale.date ? new Date(sale.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null)}
        {row('Status', sale.stage === 'Active' ? 'Active client' : sale.stage === 'Past' ? 'Past client' : sale.stage)}
        {row('Notes', sale.notes)}
      </div>
    </div>
  )
}

// ─── main ────────────────────────────────────────────────────────────────────

interface Props { initialLeads: Sale[] }

export default function DmSalesPipeline({ initialLeads }: Props) {
  const [sales, setSales] = useState<Sale[]>(initialLeads)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Sale | null>(null)
  const [editing, setEditing] = useState(false)
  const [filter, setFilter] = useState<'All' | 'Active' | 'Past'>('All')
  const isMobile = useIsMobile()

  // ── stats ──────────────────────────────────────────────────────────────────
  const totalRevenue = sales.reduce((s, l) => s + (l.deal_value ?? 0), 0)
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const salesThisMonth = sales.filter(l => (l.date || l.created_at)?.slice(0, 7) === thisMonth)
  const revenueThisMonth = salesThisMonth.reduce((s, l) => s + (l.deal_value ?? 0), 0)
  const avgDeal = sales.length ? Math.round(totalRevenue / sales.length) : 0
  const activeClients = sales.filter(l => l.stage === 'Active').length

  // ── filter ─────────────────────────────────────────────────────────────────
  const filtered = sales.filter(l => {
    if (filter === 'All') return true
    return l.stage === filter
  })

  // ── CRUD ───────────────────────────────────────────────────────────────────
  async function addSale(data: Partial<Sale>) {
    // Map to dm_sales columns: use call_date for the sale date
    const payload = {
      lead_name:  data.lead_name,
      source:     data.source,
      deal_value: data.deal_value,
      call_date:  data.date ? new Date(data.date + 'T12:00:00Z').toISOString() : null,
      notes:      data.notes,
      stage:      data.stage,
      closed:     true,
    }
    const res = await fetch('/api/dm-sales', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    if (!res.ok) { alert((await res.json()).error); return }
    const { lead } = await res.json()
    // Normalise date field for local state
    const normalised: Sale = { ...lead, date: lead.call_date?.slice(0, 10) ?? lead.created_at?.slice(0, 10) }
    setSales(prev => [normalised, ...prev])
    setShowForm(false)
  }

  async function updateSale(id: string, data: Partial<Sale>) {
    const payload: Record<string, unknown> = {
      id,
      lead_name:  data.lead_name,
      source:     data.source,
      deal_value: data.deal_value,
      call_date:  data.date ? new Date(data.date + 'T12:00:00Z').toISOString() : null,
      notes:      data.notes,
      stage:      data.stage,
    }
    const res = await fetch('/api/dm-sales', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    if (!res.ok) { alert((await res.json()).error); return }
    const { lead } = await res.json()
    const normalised: Sale = { ...lead, date: lead.call_date?.slice(0, 10) ?? lead.created_at?.slice(0, 10) }
    setSales(prev => prev.map(s => s.id === id ? normalised : s))
    setSelected(normalised)
    setEditing(false)
  }

  async function deleteSale(id: string) {
    await fetch('/api/dm-sales', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setSales(prev => prev.filter(s => s.id !== id))
    setSelected(null)
  }

  const panelOpen = selected && !isMobile

  return (
    <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: 1400, margin: '0 auto', paddingRight: panelOpen ? 404 : (isMobile ? 12 : 24) }}>
      <PageHeader
        title="Sales"
        description="Track your client wins and revenue."
        action={
          <Button size="sm" onClick={() => { setShowForm(true); setSelected(null) }} style={{ gap: 6 }}>
            <Plus size={13} /> Log Sale
          </Button>
        }
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <Stat label="Total Revenue" value={`£${totalRevenue.toLocaleString()}`} />
        <Stat label="This Month" value={`£${revenueThisMonth.toLocaleString()}`} sub={`${salesThisMonth.length} sale${salesThisMonth.length !== 1 ? 's' : ''}`} />
        <Stat label="Total Sales" value={sales.length} />
        <Stat label="Active Clients" value={activeClients} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(['All', 'Active', 'Past'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '5px 14px', borderRadius: 6, fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${filter === f ? 'var(--accent)' : 'var(--border)'}`,
            background: filter === f ? 'hsl(var(--accent-hsl, 220 90% 56%) / 0.1)' : 'var(--card)',
            color: filter === f ? 'var(--accent)' : 'var(--muted-foreground)',
          }}>
            {f === 'All' ? 'All' : f === 'Active' ? 'Active clients' : 'Past clients'}
          </button>
        ))}
      </div>

      {/* New sale form */}
      {showForm && (
        <SaleForm
          title="Log a Sale"
          initial={{}}
          onSave={addSale}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Sales list */}
      {filtered.length === 0 ? (
        <Card style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>💰</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginBottom: 6 }}>
            {sales.length === 0 ? 'No sales logged yet' : `No ${filter.toLowerCase()} clients`}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
            {sales.length === 0 ? 'Log your first sale above.' : 'Change the filter to see other sales.'}
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(sale => {
            const isSelected = selected?.id === sale.id
            const saleDate = sale.date || sale.created_at?.slice(0, 10)

            return (
              <div
                key={sale.id}
                onClick={() => {
                  if (isSelected) { setSelected(null); setEditing(false) }
                  else { setSelected(sale); setEditing(false) }
                }}
                style={{
                  background: 'var(--card)',
                  border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 14,
                  transition: 'border-color 0.15s',
                }}
              >
                {/* Revenue badge */}
                <div style={{
                  minWidth: 70, height: 36, borderRadius: 8,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, color: 'var(--foreground)',
                  flexShrink: 0,
                }}>
                  {sale.deal_value != null ? `£${sale.deal_value.toLocaleString()}` : '—'}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>
                      {sale.lead_name || 'Unnamed'}
                    </span>
                    {sale.source && (
                      <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{sale.source}</span>
                    )}
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                      background: sale.stage === 'Active' ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.06)',
                      color: sale.stage === 'Active' ? 'rgba(74,222,128,0.85)' : 'var(--muted-foreground)',
                    }}>
                      {sale.stage === 'Active' ? 'Active' : 'Past'}
                    </span>
                  </div>
                  {saleDate && (
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                      {new Date(saleDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>

                <ChevronRight size={14} style={{ color: 'var(--muted-foreground)', flexShrink: 0, transform: isSelected ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>
            )
          })}
        </div>
      )}

      {/* Detail panel / edit panel */}
      {selected && (
        editing ? (
          <SaleForm
            title={`Edit — ${selected.lead_name || 'Sale'}`}
            initial={{ ...selected, date: selected.date || selected.created_at?.slice(0, 10) }}
            onSave={data => updateSale(selected.id, data)}
            onClose={() => setEditing(false)}
          />
        ) : (
          <SalePanel
            sale={selected}
            onClose={() => setSelected(null)}
            onDelete={deleteSale}
            onEdit={() => setEditing(true)}
          />
        )
      )}
    </div>
  )
}
