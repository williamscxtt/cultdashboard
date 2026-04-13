'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Power, Trash2, Check } from 'lucide-react'

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

  const btn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)',
    background: 'var(--card)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
    color: 'var(--muted-foreground)', fontFamily: 'inherit',
    transition: 'opacity 0.1s',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>

      {/* DM keyword inline editor */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          DM
        </span>
        {editingKeyword ? (
          <>
            <input
              autoFocus
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveKeyword(); if (e.key === 'Escape') setEditingKeyword(false) }}
              placeholder="keyword"
              style={{
                fontSize: 12, fontWeight: 600, padding: '3px 8px',
                borderRadius: 5, border: '1px solid var(--accent)',
                background: 'var(--card)', color: 'var(--foreground)',
                width: 90, outline: 'none', fontFamily: 'inherit',
              }}
            />
            <button
              onClick={saveKeyword}
              disabled={loading === 'keyword'}
              style={{ ...btn, padding: '4px 8px', background: 'var(--accent)', color: 'var(--accent-foreground)', border: 'none' }}
            >
              <Check size={11} />
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditingKeyword(true)}
            style={{
              ...btn,
              padding: '3px 8px',
              color: keyword ? 'var(--foreground)' : 'var(--muted-foreground)',
              borderStyle: keyword ? 'solid' : 'dashed',
              background: keywordSaved ? 'rgba(34,197,94,0.1)' : 'var(--card)',
              borderColor: keywordSaved ? 'hsl(142 71% 45%)' : 'var(--border)',
            }}
            title="Click to set DM keyword for script CTAs"
          >
            {keywordSaved ? <Check size={11} style={{ color: 'hsl(142 71% 45%)' }} /> : null}
            {keyword || 'Set keyword'}
          </button>
        )}
      </div>

      <div style={{ width: 1, height: 16, background: 'var(--border)' }} />

      <button
        style={{ ...btn, background: 'hsl(220 90% 56%)', color: '#fff', border: 'none' }}
        onClick={viewAs}
        disabled={loading === 'view'}
      >
        <Eye size={12} />
        {loading === 'view' ? 'Switching…' : 'View as Client'}
      </button>

      <button
        style={{ ...btn }}
        onClick={toggleActive}
        disabled={loading === 'active'}
        title={isActive ? 'Deactivate account' : 'Activate account'}
      >
        <Power size={12} />
        {loading === 'active' ? '…' : isActive ? 'Deactivate' : 'Activate'}
      </button>

      <button
        style={{ ...btn, color: 'hsl(0 72% 51%)', borderColor: 'hsl(0 70% 85%)' }}
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
