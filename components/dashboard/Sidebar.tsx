'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart2, Lightbulb, MessageSquare,
  Settings, Users, LogOut, Calendar, Copy, Search,
  BookOpen, TrendingUp, PhoneCall,
  ChevronDown, ChevronUp, Send, Zap, PanelLeft, User, X,
  Sun, Moon, Lock, CreditCard, List, Magnet,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import { useState, useEffect } from 'react'

// ─── nav definitions ──────────────────────────────────────────────────────────

// Same nav for everyone — admin just gets the extra section at the bottom
// DM Sales label changes to "Sales & Deals" for creators (passed as prop to SidebarContent)
const makeMainNav = (isCreator: boolean) => [
  { href: '/dashboard/analytics',   label: 'Dashboard',                           icon: BarChart2 },
  { href: '/dashboard/content',     label: 'Content Studio',                      icon: Lightbulb },
  { href: '/dashboard/calendar',    label: 'Content Calendar',                    icon: Calendar },
  { href: '/dashboard/dm-sales',    label: isCreator ? 'Sales & Deals' : 'DM Sales', icon: PhoneCall },
  { href: '/dashboard/ai',          label: 'Ask Will AI',                         icon: MessageSquare },
]

const toolsNavBase = [
  { href: '/dashboard/hook-lab',      label: 'Hook Lab',         icon: Zap },
  { href: '/dashboard/series-planner', label: 'Series Planner',  icon: List },
  { href: '/dashboard/outreach',      label: 'Outreach',         icon: Send },
  { href: '/dashboard/reel-copy',     label: 'Reel Analyser',    icon: Copy },
  { href: '/dashboard/profile-audit', label: 'Profile Tools',    icon: Search },
  { href: '/dashboard/settings',      label: 'Settings',         icon: Settings },
]

// Onboarding Hub — shown for clients as "My Profile", not for admin
const clientOnboardingItem = { href: '/dashboard/onboarding', label: 'My Profile', icon: User }

const adminNav = [
  { href: '/dashboard/clients',       label: 'Clients',          icon: Users },
  { href: '/dashboard/reports',       label: 'Progress Reports', icon: TrendingUp },
  { href: '/dashboard/knowledge',     label: 'Knowledge Base',   icon: BookOpen },
  { href: '/dashboard/lead-magnets',  label: 'Lead Magnets',     icon: Magnet },
]

// ─── props ────────────────────────────────────────────────────────────────────

interface Props {
  realProfile: Profile
  effectiveProfile: Profile
  isImpersonating: boolean
  collapsed?: boolean
  onToggle?: () => void
  mobileOpen?: boolean
  onMobileClose?: () => void
}

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({
  href, label, icon: Icon, active, collapsed,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  active: boolean
  collapsed: boolean
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : 9,
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '0' : '0 10px',
        height: 34,
        borderRadius: 7,
        textDecoration: 'none',
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        marginBottom: 1,
        transition: 'background 0.12s, color 0.12s',
        background: active ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
        color: active ? '#ededed' : 'var(--muted-foreground)',
        boxShadow: 'none',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        width: '100%',
      }}
      onMouseEnter={e => {
        if (!active) {
          const el = e.currentTarget as HTMLElement
          el.style.background = 'rgba(255, 255, 255, 0.05)'
          el.style.color = '#ededed'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          const el = e.currentTarget as HTMLElement
          el.style.background = 'transparent'
          el.style.color = 'var(--muted-foreground)'
        }
      }}
    >
      <span style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        paddingLeft: 0,
      }}>
        <Icon size={14} />
      </span>
      {!collapsed && (
        <span style={{ letterSpacing: '-0.15px' }}>{label}</span>
      )}
    </Link>
  )
}

function LockedNavItem({
  icon: Icon, label, collapsed,
}: {
  icon: React.ComponentType<{ size?: number }>
  label: string
  collapsed: boolean
}) {
  return (
    <div
      title={collapsed ? `${label} — complete your profile to unlock` : 'Complete 75% of My Profile to unlock'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : 9,
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '0' : '0 10px',
        height: 34,
        borderRadius: 7,
        fontSize: 13,
        fontWeight: 500,
        marginBottom: 1,
        color: 'var(--muted-foreground)',
        opacity: 0.4,
        cursor: 'not-allowed',
        userSelect: 'none',
        position: 'relative',
        flexShrink: 0,
        width: '100%',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={14} />
      </span>
      {!collapsed && (
        <>
          <span style={{ letterSpacing: '-0.15px', flex: 1 }}>{label}</span>
          <Lock size={10} style={{ opacity: 0.6, flexShrink: 0 }} />
        </>
      )}
    </div>
  )
}

function SectionDivider({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) {
    return <div style={{ height: 1, background: 'var(--border)', margin: '8px 6px' }} />
  }
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 700,
      color: 'var(--muted-foreground)',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      padding: '14px 10px 5px',
      opacity: 0.7,
    }}>
      {label}
    </div>
  )
}

// ─── Sidebar inner content ────────────────────────────────────────────────────

function SidebarContent({
  realProfile,
  effectiveProfile,
  isImpersonating,
  collapsed,
  onToggle,
  onMobileClose,
}: Omit<Props, 'mobileOpen'> & { collapsed: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const [adminExpanded, setAdminExpanded] = useState(true)

  const isAdmin = realProfile.role === 'admin'
  const displayProfile = isImpersonating ? effectiveProfile : realProfile
  const isCreator = (isImpersonating ? effectiveProfile : realProfile).user_type === 'creator'
  const mainNav = makeMainNav(isCreator)
  const toolsNav = [...toolsNavBase, clientOnboardingItem]
  const [billingLoading, setBillingLoading] = useState(false)

  async function openBillingPortal() {
    setBillingLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setBillingLoading(false)
    }
  }

  // Lock nav items for clients who haven't completed ≥75% of the Onboarding Hub
  // Admins are always unlocked; impersonating admins see the client's locked state
  const hubLocked = !isAdmin && !(isImpersonating ? effectiveProfile : realProfile).onboarding_hub_complete

  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggleTheme() {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const avatarLetter = (displayProfile.name || displayProfile.email || '?')[0].toUpperCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Brand header ─────────────────────────────────────────────── */}
      <div style={{
        padding: collapsed ? '14px 0' : '14px 12px 12px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        alignItems: collapsed ? 'center' : 'stretch',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Zap size={14} color="white" fill="white" />
            </div>
            {!collapsed && (
              <div style={{
                fontSize: 13, fontWeight: 800,
                color: 'var(--foreground)',
                letterSpacing: '-0.3px',
                fontFamily: 'var(--font-display)',
              }}>
                Creator Cult
              </div>
            )}
          </div>
          {/* Mobile close button */}
          {onMobileClose && !collapsed && (
            <button
              onClick={onMobileClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--muted-foreground)', display: 'flex',
                alignItems: 'center', padding: 4, borderRadius: 6,
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Profile pill */}
        {!collapsed && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '7px 10px', borderRadius: 8,
            background: 'var(--muted)', border: '1px solid var(--border)',
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7, flexShrink: 0,
              background: isImpersonating ? 'var(--accent)' : 'var(--foreground)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800,
              color: isImpersonating ? '#fff' : 'var(--background)',
              fontFamily: 'var(--font-display)',
            }}>
              {avatarLetter}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: 12, fontWeight: 700,
                color: 'var(--foreground)',
                letterSpacing: '-0.2px', lineHeight: 1.2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: 'var(--font-display)',
              }}>
                {displayProfile.name || displayProfile.email}
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted-foreground)', marginTop: 1, lineHeight: 1 }}>
                {isImpersonating
                  ? <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Viewing as client</span>
                  : isAdmin
                    ? <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Admin</span>
                    : displayProfile.ig_username ? `@${displayProfile.ig_username}` : 'Client'
                }
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────────────── */}
      <nav style={{
        flex: 1,
        padding: collapsed ? '8px 6px 0' : '8px 8px 0',
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ flex: 1 }}>
          {mainNav.map(item => hubLocked
            ? <LockedNavItem key={item.href} icon={item.icon} label={item.label} collapsed={collapsed} />
            : <NavItem key={item.href} {...item} active={isActive(item.href)} collapsed={collapsed} />
          )}

          <SectionDivider label="Tools" collapsed={collapsed} />
          {toolsNav.map(item => {
            // "My Profile" (onboarding hub) is always accessible — it's how they unlock the rest
            const alwaysOpen = item.href === '/dashboard/onboarding'
            if (hubLocked && !alwaysOpen) {
              return <LockedNavItem key={item.href} icon={item.icon} label={item.label} collapsed={collapsed} />
            }
            return <NavItem key={item.href} {...item} active={isActive(item.href)} collapsed={collapsed} />
          })}
        </div>

        {/* Hub locked banner */}
        {hubLocked && !collapsed && (
          <div style={{
            margin: '8px 2px 4px',
            padding: '10px 12px',
            borderRadius: 8,
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.2)',
            fontSize: 11,
            color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.5,
          }}>
            <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Complete My Profile</span>
            {' '}to unlock all features. Fill in 75% of the questions and save.
          </div>
        )}

        {/* Admin section */}
        {isAdmin && (
          <div style={{
            marginTop: 8, borderTop: '1px solid var(--border)',
            paddingTop: 4, paddingBottom: 4,
          }}>
            {!collapsed && (
              <button
                onClick={() => setAdminExpanded(e => !e)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '8px 10px 4px',
                  background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <span style={{
                  fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)',
                  letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7,
                }}>
                  Admin
                </span>
                {adminExpanded
                  ? <ChevronUp size={11} color="var(--muted-foreground)" />
                  : <ChevronDown size={11} color="var(--muted-foreground)" />
                }
              </button>
            )}
            {(adminExpanded || collapsed) && adminNav.map(item => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} collapsed={collapsed} />
            ))}
          </div>
        )}
      </nav>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div style={{
        padding: collapsed ? '8px 6px' : '8px',
        borderTop: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        {onToggle && (
          <button
            onClick={onToggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              display: 'flex', alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 9, padding: collapsed ? '0' : '0 10px', height: 32, borderRadius: 7,
              width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--muted-foreground)', fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
              transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = 'var(--muted)'
              el.style.color = 'var(--foreground)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = 'transparent'
              el.style.color = 'var(--muted-foreground)'
            }}
          >
            <PanelLeft size={14} style={{ transform: collapsed ? 'scaleX(-1)' : 'none', transition: 'transform 0.2s' }} />
            {!collapsed && <span>Collapse</span>}
          </button>
        )}

        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            display: 'flex', alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 9, padding: collapsed ? '0' : '0 10px', height: 32, borderRadius: 7,
            width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--muted-foreground)', fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
            transition: 'background 0.12s, color 0.12s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'rgba(255,255,255,0.06)'
            el.style.color = 'var(--foreground)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'transparent'
            el.style.color = 'var(--muted-foreground)'
          }}
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
          {!collapsed && (isDark ? 'Light mode' : 'Dark mode')}
        </button>

        {/* Billing — visible to all except billing-exempt clients */}
        {!displayProfile.billing_exempt && (
          <button
            onClick={openBillingPortal}
            disabled={billingLoading}
            title={collapsed ? (isAdmin ? 'Preview subscribe page' : 'Manage billing') : undefined}
            style={{
              display: 'flex', alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 9, padding: collapsed ? '0' : '0 10px', height: 32, borderRadius: 7,
              width: '100%', background: 'transparent', border: 'none', cursor: billingLoading ? 'wait' : 'pointer',
              color: 'var(--muted-foreground)', fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
              transition: 'background 0.12s, color 0.12s',
              opacity: billingLoading ? 0.6 : 1,
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = 'rgba(255,255,255,0.05)'
              el.style.color = 'var(--foreground)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = 'transparent'
              el.style.color = 'var(--muted-foreground)'
            }}
          >
            <CreditCard size={14} />
            {!collapsed && (billingLoading ? 'Opening…' : isAdmin ? 'Preview billing' : 'Manage billing')}
          </button>
        )}

        <button
          onClick={signOut}
          title={collapsed ? 'Sign out' : undefined}
          style={{
            display: 'flex', alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 9, padding: collapsed ? '0' : '0 10px', height: 32, borderRadius: 7,
            width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--muted-foreground)', fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
            transition: 'background 0.12s, color 0.12s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'rgba(248,113,113,0.1)'
            el.style.color = '#f87171'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'transparent'
            el.style.color = 'var(--muted-foreground)'
          }}
        >
          <LogOut size={14} />
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function Sidebar({
  realProfile,
  effectiveProfile,
  isImpersonating,
  collapsed = false,
  onToggle,
  mobileOpen = false,
  onMobileClose,
}: Props) {
  const w = collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)'

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="sidebar-desktop"
        style={{
          width: w,
          minHeight: '100vh',
          background: 'var(--card)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          transition: 'width 0.2s cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden',
        }}
      >
        <SidebarContent
          realProfile={realProfile}
          effectiveProfile={effectiveProfile}
          isImpersonating={isImpersonating}
          collapsed={collapsed}
          onToggle={onToggle}
        />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="sidebar-mobile-overlay"
          onClick={onMobileClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 49,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className="sidebar-mobile"
        style={{
          position: 'fixed',
          top: 0, left: 0, bottom: 0,
          width: 'var(--sidebar-width)',
          background: 'var(--card)',
          borderRight: '1px solid var(--border)',
          zIndex: 50,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <SidebarContent
          realProfile={realProfile}
          effectiveProfile={effectiveProfile}
          isImpersonating={isImpersonating}
          collapsed={false}
          onMobileClose={onMobileClose}
        />
      </aside>
    </>
  )
}
