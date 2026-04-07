'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Power, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'

interface Props {
  clientId: string
  clientName: string
  isActive: boolean
}

export default function ClientDetailActions({ clientId, clientName, isActive }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function viewAs() {
    setLoading('view')
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: clientId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      // Navigate to the client's onboarding hub
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
