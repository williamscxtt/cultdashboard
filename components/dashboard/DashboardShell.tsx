'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import ImpersonationBanner from './ImpersonationBanner'
import UpgradeBanner from './UpgradeBanner'
import CreatorCultUpsellModal from './CreatorCultUpsellModal'
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
    // position:fixed pins the shell to the viewport — iOS Safari can't scroll the
    // page body when the URL bar appears/disappears, so the TopBar never moves.
    // Only <main> scrolls internally.
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      overflow: 'hidden',
      background: 'var(--background)',
    }}>
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
        <main style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingTop: 28,
          paddingBottom: 'env(safe-area-inset-bottom)',
          WebkitOverflowScrolling: 'touch',
        }}>
          {/* Upgrade banner — only shown to monthly subscribers, never to admins or during impersonation */}
          {!isImpersonating && realProfile.role !== 'admin' && (
            <div style={{ paddingLeft: 24, paddingRight: 24, paddingBottom: 0 }}>
              <UpgradeBanner profile={realProfile} />
            </div>
          )}
          {children}
        </main>
      </div>
      {/* Creator Cult upsell modal — shows every 21 days for dashboard-tier subscribers */}
      {!isImpersonating && realProfile.role !== 'admin' && (
        <CreatorCultUpsellModal profile={realProfile} />
      )}
    </div>
  )
}
