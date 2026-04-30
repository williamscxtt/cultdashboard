'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Power, Trash2, Check, MessageCircle } from 'lucide-react'

interface Props {
  clientId: string
  clientName: string
  isActive: boolean
  dmKeyword?: string | null
}

export default function ClientDetailActions({ clientId, clientName, isActive, dmKeyword }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [keyword, setKeyword] = useState(dmKeyword ?? '')
  const [keywordSaved, setKeywordSaved] = useState(false)
  const [editingKeyword, setEditingKeyword] = useState(false)

  async function viewAs() {
    setLoading('view')
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: clientId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      router.push('/dashboard/onboarding')
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to switch view')
      setLoading(null)
    }
  }

  async function toggleActive() {
    setLoading('active')
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clientId, is_active: !isActive }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setLoading(null)
    }
  }

  async function saveKeyword() {
    setLoading('keyword')
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clientId, dm_keyword: keyword.trim() }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setKeywordSaved(true)
      setEditingKeyword(false)
      setTimeout(() => setKeywordSaved(false), 2000)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save keyword')
    } finally {
      setLoading(null)
    }
  }

  async function deleteClient() {
    if (!confirm(`Permanently delete ${clientName}? This cannot be undone.`)) return
    setLoading('delete')
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clientId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      router.push('/dashboard/clients')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete')
      setLoading(null)
    }
  }

  // Shared base — every button is the same height and font
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    height: 30,
    padding: '0 11px',
    borderRadius: 7,
    border: '1px solid var(--border)',
    background: 'transparent',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--muted-foreground)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.12s',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>

      {/* DM keyword */}
      {editingKeyword ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            autoFocus
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') saveKeyword()
              if (e.key === 'Escape') setEditingKeyword(false)
            }}
            placeholder="DM keyword"
            style={{
              height: 30,
              padding: '0 10px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 7,
              border: '1px solid var(--accent)',
              background: 'var(--card)',
              color: 'var(--foreground)',
              width: 110,
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={saveKeyword}
            disabled={loading === 'keyword'}
            style={{ ...base, border: 'none', background: 'var(--accent)', color: 'white', padding: '0 10px' }}
          >
            <Check size={12} />
          </button>
          <button
            onClick={() => setEditingKeyword(false)}
            style={{ ...base, padding: '0 9px', fontSize: 13 }}
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditingKeyword(true)}
          style={{
            ...base,
            color: keyword ? 'var(--foreground)' : 'var(--muted-foreground)',
            borderStyle: keyword ? 'solid' : 'dashed',
            background: keywordSaved ? 'rgba(34,197,94,0.08)' : 'transparent',
            borderColor: keywordSaved ? 'hsl(142 71% 45%)' : 'var(--border)',
          }}
          title="DM keyword for script CTAs — click to edit"
        >
          {keywordSaved
            ? <Check size={11} style={{ color: 'hsl(142 71% 45%)' }} />
            : <MessageCircle size={11} />
          }
          {keyword || 'DM keyword'}
        </button>
      )}

      {/* View as Client */}
      <button
        style={{ ...base, border: 'none', background: 'var(--accent)', color: 'white' }}
        onClick={viewAs}
        disabled={loading === 'view'}
      >
        <Eye size={12} />
        {loading === 'view' ? 'Switching…' : 'View as Client'}
      </button>

      {/* Activate / Deactivate */}
      <button
        style={{ ...base }}
        onClick={toggleActive}
        disabled={loading === 'active'}
        title={isActive ? 'Deactivate account' : 'Activate account'}
      >
        <Power size={12} />
        {loading === 'active' ? '…' : isActive ? 'Deactivate' : 'Activate'}
      </button>

      {/* Delete — solid red */}
      <button
        style={{ ...base, border: 'none', background: 'hsl(0 72% 51%)', color: 'white' }}
        onClick={deleteClient}
        disabled={loading === 'delete'}
        title="Delete account permanently"
      >
        <Trash2 size={12} />
        {loading === 'delete' ? 'Deleting…' : 'Delete'}
      </button>

    </div>
  )
}
