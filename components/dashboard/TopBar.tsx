'use client'

import { usePathname } from 'next/navigation'
import type { Profile } from '@/lib/types'
import { Command, Menu } from 'lucide-react'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':               'Home',
  '/dashboard/analytics':     'Analytics',
  '/dashboard/scripts':       'This Week',
  '/dashboard/content':       'Content Intel',
  '/dashboard/weekly-log':    'Weekly Log',
  '/dashboard/dm-sales':      'DM Sales',
  '/dashboard/ai':            'Ask Will AI',
  '/dashboard/outreach':      'Outreach',
  '/dashboard/calendar':      'Content Calendar',
  '/dashboard/reel-copy':     'Reel Analyser',
  '/dashboard/profile-audit': 'Profile Audit',
  '/dashboard/onboarding':    'My Profile',
  '/dashboard/settings':      'Settings',
  '/dashboard/clients':       'Clients',
'/dashboard/reports':       'Progress Reports',
  '/dashboard/intel':         'Global Intel',
  '/dashboard/knowledge':     'Knowledge Base',
}

interface Props {
  profile: Profile
  isImpersonating: boolean
  onMobileMenuOpen?: () => void
}

export default function TopBar({ profile, isImpersonating, onMobileMenuOpen }: Props) {
  const pathname = usePathname()

  const pageTitle =
    PAGE_TITLES[pathname] ??
    Object.entries(PAGE_TITLES).find(([k]) => pathname.startsWith(k + '/'))?.[1] ??
    'Dashboard'

  const avatarLetter = (profile.name || profile.email || '?')[0].toUpperCase()

  return (
    <>
      {/* Inject responsive CSS */}
      <style>{`
        .topbar-cmd-k { display: flex; }
        .sidebar-desktop { display: flex !important; }
        .sidebar-mobile { display: flex !important; }
        @media (max-width: 768px) {
          .topbar-cmd-k { display: none !important; }
          .sidebar-desktop { display: none !important; }
        }
        @media (min-width: 769px) {
          .topbar-hamburger { display: none !important; }
          .sidebar-mobile { display: none !important; }
          .sidebar-mobile-overlay { display: none !important; }
        }
      `}</style>

      <header style={{
        height: 'var(--topbar-height)',
        flexShrink: 0,
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        background: 'var(--card)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}>
        {/* Left: hamburger (mobile) + breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Mobile hamburger */}
          <button
            className="topbar-hamburger"
            onClick={onMobileMenuOpen}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 7,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--foreground)',
            }}
          >
            <Menu size={18} />
          </button>

          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{
              fontSize: 12,
              color: 'var(--muted-foreground)',
              fontWeight: 500,
              letterSpacing: '-0.1px',
            }}>
              Creator Cult
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M4.5 2.5L7.5 6L4.5 9.5" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--foreground)',
              letterSpacing: '-0.25px',
              fontFamily: 'var(--font-display)',
            }}>
              {pageTitle}
            </span>
          </div>
        </div>

        {/* Right: CMD+K + avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            className="topbar-cmd-k"
            style={{
              alignItems: 'center',
              gap: 4,
              padding: '4px 9px',
              borderRadius: 6,
              background: 'var(--muted)',
              border: '1px solid var(--border)',
              color: 'var(--muted-foreground)',
              fontSize: 11,
              fontWeight: 600,
              userSelect: 'none',
            }}
          >
            <Command size={10} />
            <span>K</span>
          </div>

          {/* Avatar */}
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: isImpersonating ? 'var(--accent)' : 'var(--foreground)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 800,
            color: isImpersonating ? '#fff' : 'var(--background)',
            flexShrink: 0,
            cursor: 'pointer',
            letterSpacing: '-0.2px',
            fontFamily: 'var(--font-display)',
          }}>
            {avatarLetter}
          </div>
        </div>
      </header>
    </>
  )
}
