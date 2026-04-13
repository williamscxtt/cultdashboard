'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import ImpersonationBanner from './ImpersonationBanner'
import type { Profile } from '@/lib/types'

interface Props {
  realProfile: Profile
  effectiveProfile: Profile
  isImpersonating: boolean
  children: React.ReactNode
}

export default function DashboardShell({
  realProfile,
  effectiveProfile,
  isImpersonating,
  children,
}: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored === 'true') setCollapsed(true)
    setMounted(true)
  }, [])

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  function handleToggle() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('sidebar-collapsed', String(next))
      return next
    })
  }

  const openMobile = useCallback(() => setMobileOpen(true), [])
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  const displayProfile = isImpersonating ? effectiveProfile : realProfile

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--background)' }}>
      <Sidebar
        realProfile={realProfile}
        effectiveProfile={effectiveProfile}
        isImpersonating={isImpersonating}
        collapsed={mounted ? collapsed : false}
        onToggle={handleToggle}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobile}
      />
      <div style={{
        flex: 1,
        minWidth: 0,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <TopBar
          profile={displayProfile}
          isImpersonating={isImpersonating}
          onMobileMenuOpen={openMobile}
        />
        {isImpersonating && (
          <ImpersonationBanner
            clientName={effectiveProfile.name || effectiveProfile.email || 'Client'}
          />
        )}
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
