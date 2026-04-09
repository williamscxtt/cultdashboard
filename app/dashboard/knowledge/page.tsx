'use client'
import { useState, useEffect, useRef } from 'react'
import { Card, PageHeader, SectionLabel } from '@/components/ui'
import { toast } from 'sonner'
import { Trash2, Search, Sparkles, Upload, FileText, X, ChevronDown, ChevronUp, Check } from 'lucide-react'

interface KnowledgeDocument {
  id: string
  title: string
  content: string
  source: string
  category: string
  created_at: string
}

interface IngestDoc {
  title: string
  category: string
  source: string
  content: string
  selected: boolean
}

const CATEGORIES = ['Hook Writing', 'Offer Building', 'Personal Branding', 'Mindset', 'Sales', 'Content Strategy', 'Coaching Framework', 'Case Study', 'Script', 'Other']

function categoryStyle(category: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    'Hook Writing':       { background: 'hsl(220 90% 56% / 0.12)', color: 'hsl(220 90% 56%)' },
    'Offer Building':     { background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.55)' },
    'Personal Branding':  { background: 'hsl(270 60% 55% / 0.12)', color: 'hsl(270 60% 55%)' },
    'Mindset':            { background: 'hsl(38 92% 45% / 0.12)', color: 'rgba(255,255,255,0.35)' },
    'Sales':              { background: 'hsl(20 80% 45% / 0.12)', color: 'hsl(20 80% 45%)' },
    'Content Strategy':   { background: 'hsl(180 60% 35% / 0.12)', color: 'hsl(180 70% 40%)' },
    'Coaching Framework': { background: 'hsl(300 50% 50% / 0.12)', color: 'hsl(300 50% 55%)' },
    'Case Study':         { background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)' },
    'Script':             { background: 'hsl(50 90% 45% / 0.12)', color: 'hsl(50 90% 40%)' },
  }
  return map[category] || { background: 'var(--muted)', color: 'var(--muted-foreground)' }
}

const badge: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center',
  fontSize: 11, fontWeight: 600, padding: '2px 8px',
  borderRadius: 999, whiteSpace: 'nowrap',
}

function CategoryBadge({ category }: { category: string }) {
  return <span style={{ ...badge, ...categoryStyle(category) }}>{category}</span>
}

export default function KnowledgePage() {
  const [docs, setDocs] = useState<KnowledgeDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Ingest state
  const [description, setDescription] = useState('')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [analysing, setAnalysing] = useState(false)
  const [preview, setPreview] = useState<IngestDoc[] | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Manual add (collapsed by default)
  const [showManual, setShowManual] = useState(false)
  const [manual, setManual] = useState({ title: '', content: '', source: 'Will Scott', category: 'Content Strategy' })
  const [manualSaving, setManualSaving] = useState(false)

  async function fetchDocs() {
    setLoading(true)
    try {
      const res = await fetch('/api/knowledge')
      const json = await res.json()
      setDocs(json.documents || [])
    } catch { toast.error('Failed to load documents') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchDocs() }, [])

  async function handleAnalyse() {
    if (!text.trim() && !file) {
      toast.error('Paste some content or select a file first')
      return
    }
    setAnalysing(true)
    setPreview(null)
    try {
      const form = new FormData()
      if (description.trim()) form.append('description', description)
      if (file) form.append('file', file)
      if (text.trim()) form.append('text', text)

      const res = await fetch('/api/knowledge/ingest', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      setPreview((data.documents as IngestDoc[]).map(d => ({ ...d, selected: true })))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Analysis failed')
    }
    setAnalysing(false)
  }

  async function handleSaveSelected() {
    if (!preview) return
    const toSave = preview.filter(d => d.selected)
    if (!toSave.length) { toast.error('Select at least one document'); return }
    setSaving(true)
    let saved = 0
    for (const doc of toSave) {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: doc.title, content: doc.content, source: doc.source, category: doc.category }),
      })
      if (res.ok) saved++
    }
    toast.success(`${saved} document${saved !== 1 ? 's' : ''} added to Knowledge Base`)
    setPreview(null)
    setText('')
    setFile(null)
    setDescription('')
    fetchDocs()
    setSaving(false)
  }

  async function handleManualAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!manual.title.trim() || !manual.content.trim()) { toast.error('Title and content required'); return }
    setManualSaving(true)
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manual),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save')
      toast.success('Document added')
      setManual({ title: '', content: '', source: 'Will Scott', category: 'Content Strategy' })
      fetchDocs()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    }
    setManualSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this document?')) return
    setDeletingId(id)
    try {
      const res = await fetch('/api/knowledge', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Deleted')
      setDocs(prev => prev.filter(d => d.id !== id))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    }
    setDeletingId(null)
  }

  const filtered = docs.filter(d => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q) || d.source.toLowerCase().includes(q) || d.category.toLowerCase().includes(q)
  })

  return (
    <div style={{ padding: '24px', maxWidth: 860, margin: '0 auto' }}>
      <PageHeader
        title="Knowledge Base"
        description="Paste content, drop a file, or describe what you're adding — AI organises it automatically."
      />

      {/* ── AI Ingest ── */}
      <Card style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Sparkles size={15} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>Add Knowledge</span>
        </div>

        {/* Description hint */}
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 5 }}>
            What is this? <span style={{ fontWeight: 400 }}>(optional — helps AI understand context)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Alex Hormozi's offer building framework, my best-performing scripts, client transformation stories..."
            style={{ width: '100%' }}
          />
        </div>

        {/* File upload */}
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${file ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 8, padding: '12px 16px', marginBottom: 10, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10, transition: 'border-color 0.15s',
            background: file ? 'var(--accent)/5' : 'transparent',
          }}
          onMouseEnter={e => { if (!file) (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)' }}
          onMouseLeave={e => { if (!file) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,.md,.csv,.xlsx"
            style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files?.[0] ?? null
              setFile(f)
              if (f) setText('')
            }}
          />
          {file ? (
            <>
              <FileText size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--foreground)', fontWeight: 500, flex: 1 }}>{file.name}</span>
              <button onClick={e => { e.stopPropagation(); setFile(null); if (fileRef.current) fileRef.current.value = '' }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', padding: 2 }}>
                <X size={14} />
              </button>
            </>
          ) : (
            <>
              <Upload size={15} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
                Drop a file or click to upload — <strong>PDF, TXT, MD, CSV, XLSX</strong>
              </span>
            </>
          )}
        </div>

        {/* Divider */}
        {!file && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 500 }}>or paste text</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
        )}

        {/* Text paste */}
        {!file && (
          <textarea
            rows={8}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste anything — frameworks, scripts, notes, transcripts, case studies, sales conversations..."
            style={{ resize: 'vertical', lineHeight: 1.65, marginBottom: 10 }}
          />
        )}

        <button
          onClick={handleAnalyse}
          disabled={analysing || (!text.trim() && !file)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, height: 38, padding: '0 18px',
            borderRadius: 8, border: 'none',
            background: analysing || (!text.trim() && !file) ? 'var(--muted)' : 'var(--accent)',
            color: analysing || (!text.trim() && !file) ? 'var(--muted-foreground)' : '#fff',
            fontSize: 13, fontWeight: 600, cursor: analysing ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', transition: 'opacity 0.15s',
            opacity: analysing ? 0.7 : 1,
          }}
        >
          <Sparkles size={13} />
          {analysing ? 'Analysing…' : 'Analyse & Import'}
        </button>
      </Card>

      {/* ── Preview ── */}
      {preview && (
        <Card style={{ padding: 20, marginBottom: 16, border: '1px solid var(--accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>
                AI found {preview.length} document{preview.length !== 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>
                Review, deselect any you don't want, then save.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setPreview(p => p?.map(d => ({ ...d, selected: true })) ?? null)}
                style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', fontFamily: 'inherit' }}
              >
                Select all
              </button>
              <button
                onClick={handleSaveSelected}
                disabled={saving || !preview.some(d => d.selected)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 16px',
                  borderRadius: 7, border: 'none',
                  background: preview.some(d => d.selected) ? 'var(--accent)' : 'var(--muted)',
                  color: preview.some(d => d.selected) ? '#fff' : 'var(--muted-foreground)',
                  fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', opacity: saving ? 0.6 : 1,
                }}
              >
                <Check size={12} />
                {saving ? 'Saving…' : `Save ${preview.filter(d => d.selected).length} selected`}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {preview.map((doc, i) => (
              <div
                key={i}
                onClick={() => setPreview(p => p?.map((d, j) => j === i ? { ...d, selected: !d.selected } : d) ?? null)}
                style={{
                  padding: '14px 16px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${doc.selected ? 'var(--accent)' : 'var(--border)'}`,
                  background: doc.selected ? 'var(--accent)/5' : 'var(--muted)',
                  opacity: doc.selected ? 1 : 0.5,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
                    border: `2px solid ${doc.selected ? 'var(--accent)' : 'var(--border)'}`,
                    background: doc.selected ? 'var(--accent)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {doc.selected && <Check size={11} color="#fff" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>{doc.title}</span>
                      <CategoryBadge category={doc.category} />
                      <span style={{ ...badge, background: 'var(--muted)', color: 'var(--muted-foreground)' }}>{doc.source}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.6, margin: 0 }}>
                      {doc.content.slice(0, 180)}{doc.content.length > 180 ? '…' : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Manual Add (collapsed) ── */}
      <button
        onClick={() => setShowManual(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', fontFamily: 'inherit',
        }}
      >
        {showManual ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        Add manually (with title &amp; category)
      </button>

      {showManual && (
        <Card style={{ padding: 20, marginBottom: 16 }}>
          <SectionLabel>Manual Add</SectionLabel>
          <form onSubmit={handleManualAdd} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="text"
              value={manual.title}
              onChange={e => setManual(f => ({ ...f, title: e.target.value }))}
              placeholder="Title"
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <select value={manual.source} onChange={e => setManual(f => ({ ...f, source: e.target.value }))}>
                {['Will Scott', 'Nick Theriot', 'Alex Hormozi', 'Client Result', 'Other'].map(s => <option key={s}>{s}</option>)}
              </select>
              <select value={manual.category} onChange={e => setManual(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <textarea
              rows={8}
              value={manual.content}
              onChange={e => setManual(f => ({ ...f, content: e.target.value }))}
              placeholder="Paste the knowledge content here..."
              style={{ resize: 'vertical' }}
            />
            <div>
              <button
                type="submit"
                disabled={manualSaving}
                style={{
                  height: 36, padding: '0 16px', borderRadius: 7, border: 'none',
                  background: 'var(--accent)', color: '#fff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  opacity: manualSaving ? 0.6 : 1,
                }}
              >
                {manualSaving ? 'Adding…' : 'Add Document'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* ── Document list ── */}
      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents..."
            style={{ paddingLeft: 34 }}
          />
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
          {docs.length} document{docs.length !== 1 ? 's' : ''}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map(i => (
            <Card key={i} style={{ padding: 16 }}>
              <div style={{ height: 13, width: '40%', background: 'var(--muted)', borderRadius: 4, marginBottom: 8 }} />
              <div style={{ height: 11, width: '70%', background: 'var(--muted)', borderRadius: 4 }} />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>
            {search ? 'No documents match' : 'No documents yet'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
            {search ? 'Try a different search term.' : 'Paste or upload content above to get started.'}
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(doc => (
            <Card key={doc.id} style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>{doc.title}</span>
                    <span style={{ ...badge, background: 'var(--muted)', color: 'var(--muted-foreground)' }}>{doc.source}</span>
                    <CategoryBadge category={doc.category} />
                  </div>
                  <p style={{
                    fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.6,
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', margin: '0 0 6px',
                  }}>
                    {doc.content.slice(0, 200)}{doc.content.length > 200 ? '…' : ''}
                  </p>
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                    {new Date(doc.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={deletingId === doc.id}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'color 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'hsl(0 72% 51%)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
