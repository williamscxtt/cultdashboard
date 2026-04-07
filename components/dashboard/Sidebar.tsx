'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart2, Lightbulb, FileText, MessageSquare,
  Settings, Users, Globe, LogOut, Calendar, Copy, Search,
  BookOpen, TrendingUp, ClipboardList, ListChecks, PhoneCall,
  ChevronDown, ChevronUp, Send, Zap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import { useState } from 'react'

// ─── nav definitions ──────────────────────────────────────────────────────────

const mainNav = [
  { href: '/dashboard/onboarding',  label: 'Onboarding Hub', icon: ClipboardList },
  { href: '/dashboard/analytics',   label: 'Dashboard',      icon: BarChart2 },
  { href: '/dashboard/content',     label: 'Content',        icon: Lightbulb },
  { href: '/dashboard/scripts',     label: 'Scripts',        icon: FileText },
  { href: '/dashboard/weekly-log',  label: 'Weekly Log',     icon: ListChecks },
  { href: '/dashboard/dm-sales',    label: 'DM Sales',       icon: PhoneCall },
  { href: '/dashboard/outreach',    label: 'Outreach',       icon: Send },
  { href: '/dashboard/calendar',    label: 'Calendar',       icon: Calendar },
  { href: '/dashboard/ai',          label: 'Ask Will AI',    icon: MessageSquare },
]

const toolsNav = [
  { href: '/dashboard/reel-copy',     label: 'Reel Copy Tool', icon: Copy },
  { href: '/dashboard/profile-audit', label: 'Profile Audit',  icon: Search },
  { href: '/dashboard/settings',      label: 'Settings',       icon: Settings },
]

const adminNav = [
  { href: '/dashboard/clients',   label: 'Clients',          icon: Users },
  { href: '/dashboard/intel',     label: 'Intel',            icon: Globe },
  { href: '/dashboard/knowledge', label: 'Knowledge Base',   icon: BookOpen },
  { href: '/dashboard/reports',   label: 'Progress Reports', icon: TrendingUp },
]

// ─── props ────────────────────────────────────────────────────────────────────

interface Props {
  realProfile: Profile
  effectiveProfile: Profile
  isImpersonating: boolean
}

// ─── sub-components ───────────────────────────────────────────────────────────

function NavItem({ href, label, icon: Icon, active }: {
  href: string; label: string
  icon: React.ComponentType<{ size?: number }>
  active: boolean
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '0 10px', height: 34, borderRadius: 8,
        textDecoration: 'none', fontSize: 13, fontWeight: active ? 600 : 500,
        background: active ? 'var(--background)' : 'transparent',
        color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
        marginBottom: 1, transition: 'background 0.12s, color 0.12s',
        boxShadow: active ? 'var(--shadow-xs)' : 'none',
        border: active ? '1px solid var(--border)' : '1px solid transparent',
      }}
      onMouseEnter={e => {
        if (!active) {
          const el = e.currentTarget as HTMLElement
          el.style.background = 'var(--muted)'
          el.style.color = 'var(--foreground)'
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
      <Icon size={14} />
      {label}
    </Link>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)',
      letterSpacing: '0.1em', textTransform: 'uppercase',
      padding: '14px 10px 5px',
    }}>
      {label}
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export default function Sidebar({ realProfile, effectiveProfile, isImpersonating }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [adminExpanded, setAdminExpanded] = useState(true)

  const isAdmin = realProfile.role === 'admin'
  const displayProfile = isImpersonating ? effectiveProfile : realProfile

  const isActive = (href: string) =>
    href === '/dashboard/onboarding'
      ? pathname === href || pathname === '/dashboard'
      : pathname.startsWith(href)

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const avatarLetter = (displayProfile.name || displayProfile.email || '?')[0].toUpperCase()

  return (
    <aside style={{
      width: 224,
      minHeight: '100vh',
      background: 'var(--card)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      height: '100vh',
    }}>

      {/* ── Brand header ─────────────────────────────────────────────────── */}
      <div style={{ padding: '14px 12px 12px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Zap size={14} color="white" fill="white" />
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.3px' }}>
            Creator Cult
          </div>
        </div>

        {/* Profile */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '8px 10px', borderRadius: 9,
          background: 'var(--muted)', border: '1px solid var(--border)',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: isImpersonating ? 'var(--accent)' : 'var(--foreground)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800,
            color: isImpersonating ? '#fff' : 'var(--background)',
          }}>
            {avatarLetter}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: 'var(--foreground)',
              letterSpacing: '-0.2px', lineHeight: 1.2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {displayProfile.name || displayProfile.email}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted-foreground)', marginTop: 1, lineHeight: 1 }}>
              {isImpersonating
                ? <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Viewing as client</span>
                : isAdmin
                  ? <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-foreground)' }}>Admin</span>
                  : displayProfile.ig_username ? `@${displayProfile.ig_username}` : 'Client'
              }
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav style={{ flex: 1, padding: '8px 8px 0', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1 }}>
          {mainNav.map(item => (
            <NavItem key={item.href} {...item} active={isActive(item.href)} />
          ))}

          <SectionDivider label="Tools" />
          {toolsNav.map(item => (
            <NavItem key={item.href} {...item} active={isActive(item.href)} />
          ))}
        </div>

        {/* Admin section */}
        {isAdmin && (
          <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 4, paddingBottom: 4 }}>
            <button
              onClick={() => setAdminExpanded(e => !e)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '8px 10px 4px', background: 'none', border: 'none',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <span style={{
                fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)',
                letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                Admin
              </span>
              {adminExpanded
                ? <ChevronUp size={11} color="var(--muted-foreground)" />
                : <ChevronDown size={11} color="var(--muted-foreground)" />
              }
            </button>
            {adminExpanded && adminNav.map(item => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} />
            ))}
          </div>
        )}
      </nav>

      {/* ── Sign out ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={signOut}
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '0 10px', height: 34, borderRadius: 8, width: '100%',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--muted-foreground)', fontSize: 13, fontWeight: 500,
            fontFamily: 'inherit', transition: 'background 0.12s, color 0.12s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'hsl(0 50% 96%)'
            el.style.color = 'hsl(0 72% 51%)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'transparent'
            el.style.color = 'var(--muted-foreground)'
          }}
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
