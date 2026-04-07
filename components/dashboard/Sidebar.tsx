'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, BarChart2, Lightbulb, FileText, MessageSquare,
  Settings, Users, Globe, LogOut, Calendar, Copy, Search,
  BookOpen, TrendingUp, Zap
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/lib/types'

const nav = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/dashboard/content', label: 'Content', icon: Lightbulb },
  { href: '/dashboard/scripts', label: 'Scripts', icon: FileText },
  { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar },
  { href: '/dashboard/ai', label: 'Ask Will AI', icon: MessageSquare },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

const toolsNav = [
  { href: '/dashboard/reel-copy', label: 'Reel Copy Tool', icon: Copy },
  { href: '/dashboard/profile-audit', label: 'Profile Audit', icon: Search },
]

const adminNav = [
  { href: '/dashboard/clients', label: 'Clients', icon: Users },
  { href: '/dashboard/intel', label: 'Intel', icon: Globe },
  { href: '/dashboard/knowledge', label: 'Knowledge Base', icon: BookOpen },
  { href: '/dashboard/reports', label: 'Progress Reports', icon: TrendingUp },
]

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const NavItem = ({ href, label, icon: Icon, exact }: { href: string, label: string, icon: React.ComponentType<{ size?: number }>, exact?: boolean }) => {
    const active = isActive(href, exact)
    return (
      <Link href={href} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 12px', height: 36, borderRadius: 8,
        textDecoration: 'none', fontSize: 13, fontWeight: 500,
        background: active ? 'var(--foreground)' : 'transparent',
        color: active ? 'var(--background)' : 'var(--muted-foreground)',
        marginBottom: 1,
        boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
        transition: 'background 0.1s, color 0.1s',
      }}
      onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'var(--muted)'; (e.currentTarget as HTMLElement).style.color = 'var(--foreground)' } }}
      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)' } }}
      >
        <Icon size={15} />
        {label}
      </Link>
    )
  }

  const SectionLabel = ({ label }: { label: string }) => (
    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted-foreground)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '14px 12px 4px' }}>
      {label}
    </div>
  )

  return (
    <aside style={{
      width: 240, minHeight: '100vh', background: 'var(--card)',
      borderRight: '1px solid var(--border)', display: 'flex',
      flexDirection: 'column', flexShrink: 0,
      position: 'sticky', top: 0, height: '100vh',
    }}>
      {/* Brand */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <Zap size={14} style={{ color: 'var(--accent)' }} />
          <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--foreground)', letterSpacing: '-0.3px' }}>
            CULT <span style={{ color: 'var(--accent)' }}>Dashboard</span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 500 }}>
          {profile.name || profile.email}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>
        {nav.map(item => <NavItem key={item.href} {...item} />)}

        <SectionLabel label="Tools" />
        {toolsNav.map(item => <NavItem key={item.href} {...item} />)}

        {profile.role === 'admin' && (
          <>
            <SectionLabel label="Admin" />
            {adminNav.map(item => <NavItem key={item.href} {...item} />)}
          </>
        )}
      </nav>

      {/* Sign out */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--border)' }}>
        <button onClick={signOut} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 12px', height: 36, borderRadius: 8, width: '100%',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--muted-foreground)', fontSize: 13, fontWeight: 500,
          fontFamily: 'inherit', transition: 'background 0.1s, color 0.1s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'hsl(0 50% 96%)'; (e.currentTarget as HTMLElement).style.color = 'hsl(0 72% 51%)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)' }}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
