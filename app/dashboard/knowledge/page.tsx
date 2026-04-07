'use client'
import { useState, useEffect } from 'react'
import { Card, Button, PageHeader, SectionLabel } from '@/components/ui'
import { toast } from 'sonner'
import { Trash2, Search } from 'lucide-react'

interface KnowledgeDocument {
  id: string
  title: string
  content: string
  source: string
  category: string
  created_at: string
}

const SOURCES = ['Will Scott', 'Nick Setting', 'Alex Hormozi', 'Client Result', 'Coaching Framework', 'Other']
const CATEGORIES = ['Hook Writing', 'Offer Building', 'Personal Branding', 'Mindset', 'Sales', 'Content Strategy', 'Other']

function categoryStyle(category: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    'Hook Writing':       { background: 'hsl(220 90% 56% / 0.1)', color: 'hsl(220 90% 56%)' },
    'Offer Building':     { background: 'hsl(142 50% 95%)', color: 'hsl(142 71% 35%)' },
    'Personal Branding':  { background: 'hsl(270 60% 95%)', color: 'hsl(270 60% 50%)' },
    'Mindset':            { background: 'hsl(38 70% 95%)', color: 'hsl(38 92% 40%)' },
    'Sales':              { background: 'hsl(20 70% 95%)', color: 'hsl(20 80% 45%)' },
    'Content Strategy':   { background: 'hsl(180 50% 90%)', color: 'hsl(180 70% 30%)' },
    'Other':              { background: 'var(--muted)', color: 'var(--muted-foreground)' },
  }
  return map[category] || map['Other']
}

const badgeBase: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center',
  fontSize: 11, fontWeight: 600, padding: '2px 8px',
  borderRadius: 999, whiteSpace: 'nowrap',
}

function CategoryBadge({ category }: { category: string }) {
  return <span style={{ ...badgeBase, ...categoryStyle(category) }}>{category}</span>
}

function SourceBadge({ source }: { source: string }) {
  return (
    <span style={{ ...badgeBase, background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
      {source}
    </span>
  )
}

export default function KnowledgePage() {
  const [docs, setDocs] = useState<KnowledgeDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    content: '',
    source: 'Will Scott',
    category: 'Content Strategy',
  })

  async function fetchDocs() {
    setLoading(true)
    try {
      const res = await fetch('/api/knowledge')
      const json = await res.json()
      setDocs(json.documents || [])
    } catch {
      toast.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDocs() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Title and content are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save')
      toast.success('Document added to knowledge base')
      setForm({ title: '', content: '', source: 'Will Scott', category: 'Content Strategy' })
      fetchDocs()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this document from the knowledge base?')) return
    setDeletingId(id)
    try {
      const res = await fetch('/api/knowledge', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to delete')
      toast.success('Document deleted')
      setDocs(prev => prev.filter(d => d.id !== id))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = docs.filter(d => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      d.title.toLowerCase().includes(q) ||
      d.content.toLowerCase().includes(q) ||
      d.source.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q)
    )
  })

  return (
    <div style={{ padding: '24px', maxWidth: 860, margin: '0 auto' }}>
      <PageHeader
        title="Knowledge Base"
        description="Everything the AI knows. Add frameworks, case studies, your own scripts — the more you add, the smarter it gets."
      />

      {/* Add Document Form */}
      <Card style={{ padding: 20, marginBottom: 20 }}>
        <SectionLabel>Add Document</SectionLabel>
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>
              Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Hook formula for transformation reels"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>
                Source
              </label>
              <select
                value={form.source}
                onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
              >
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>
                Category
              </label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>
              Content
            </label>
            <textarea
              rows={12}
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Paste the knowledge, script, framework, case study, or insight here..."
              style={{ resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>

          <div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Adding...' : 'Add to Knowledge Base'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Documents List */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={14} style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--muted-foreground)', pointerEvents: 'none',
          }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents..."
            style={{ paddingLeft: 34 }}
          />
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
          {docs.length} document{docs.length !== 1 ? 's' : ''} &middot; Growing every week
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => (
            <Card key={i} style={{ padding: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ height: 14, width: '40%', background: 'var(--muted)', borderRadius: 4 }} />
                <div style={{ height: 12, width: '20%', background: 'var(--muted)', borderRadius: 4 }} />
                <div style={{ height: 12, width: '80%', background: 'var(--muted)', borderRadius: 4 }} />
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>
            {search ? 'No documents match your search' : 'No documents yet'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
            {search ? 'Try a different search term.' : 'Add your first document above to get started.'}
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(doc => (
            <Card key={doc.id} style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{doc.title}</span>
                    <SourceBadge source={doc.source} />
                    <CategoryBadge category={doc.category} />
                  </div>
                  <p style={{
                    fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.6,
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                    marginBottom: 8,
                  }}>
                    {doc.content.slice(0, 200)}{doc.content.length > 200 ? '…' : ''}
                  </p>
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                    Added {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={deletingId === doc.id}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'var(--muted-foreground)', padding: 6, borderRadius: 6,
                    display: 'flex', alignItems: 'center', flexShrink: 0,
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'hsl(0 72% 51%)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)' }}
                  title="Delete document"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
