'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Eye, X } from 'lucide-react'

export default function ImpersonationBanner({ clientName }: { clientName: string }) {
  const router = useRouter()
  const [exiting, setExiting] = useState(false)

  async function exitImpersonation() {
    setExiting(true)
    try {
      await fetch('/api/admin/impersonate', { method: 'DELETE' })
      router.push('/dashboard/clients')
      router.refresh()
    } finally {
      setExiting(false)
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'hsl(220 90% 56%)', color: '#fff',
      padding: '8px 20px', fontSize: 13, fontWeight: 600,
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Eye size={14} />
        Viewing as <strong>{clientName}</strong> — you can see and use their full dashboard
      </div>
      <button
        onClick={exitImpersonation}
        disabled={exiting}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 5, color: '#fff', padding: '4px 10px',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'inherit', opacity: exiting ? 0.7 : 1,
        }}
      >
        <X size={11} />
        {exiting ? 'Exiting…' : 'Exit'}
      </button>
    </div>
  )
}
