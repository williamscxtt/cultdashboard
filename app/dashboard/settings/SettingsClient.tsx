'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import { Card, Badge, Button, PageHeader, SectionLabel } from '@/components/ui'
import { Video, LogOut, Check } from 'lucide-react'
import { toast } from 'sonner'
import CompetitorManager from '@/components/dashboard/CompetitorManager'

// Instagram icon (not in lucide-react)
function IgIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function SettingsClient({ profile }: { profile: Profile }) {
  const [name, setName] = useState(profile.name || '')
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const igConnected = searchParams.get('ig_connected') === '1'
  const igErrorRaw  = searchParams.get('ig_error')
  const igError     = igErrorRaw && igErrorRaw !== '1' ? igErrorRaw : igErrorRaw ? 'Instagram connection failed.' : null

  useEffect(() => {
    if (igConnected) toast.success('Instagram connected!')
    if (igError)     toast.error(igError)
  }, [igConnected, igError])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ name }).eq('id', profile.id)
    if (error) toast.error(error.message)
    else { toast.success('Profile saved!'); router.refresh() }
    setSaving(false)
  }

  async function handlePasswordReset() {
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email ?? '', {
      redirectTo: `${window.location.origin}/dashboard/settings`,
    })
    if (error) toast.error(error.message)
    else toast.success('Password reset email sent!')
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleDisconnectIG() {
    setDisconnecting(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ ig_access_token: null, ig_username: null, ig_user_id: null })
      .eq('id', profile.id)
    if (error) toast.error(error.message)
    else { toast.success('Instagram disconnected.'); router.refresh() }
    setDisconnecting(false)
  }

  return (
    <div style={{ padding: '24px', maxWidth: 640, margin: '0 auto' }}>
      <PageHeader title="Settings" description="Manage your account and connected channels." />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Profile */}
        <Card style={{ padding: 20 }}>
          <SectionLabel>Profile</SectionLabel>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>Full name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>Email</label>
              <input type="email" value={profile.email ?? ''} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
            </div>
            <div>
              <Button type="submit" disabled={saving} size="sm">
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Instagram */}
        <Card style={{ padding: 20 }}>
          <SectionLabel>Instagram</SectionLabel>
          {profile.ig_username ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: 'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <IgIcon size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>
                      @{profile.ig_username}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                      {profile.ig_access_token ? (
                        <>
                          <Check size={11} style={{ color: 'hsl(142 50% 45%)' }} />
                          <span style={{ fontSize: 12, color: 'hsl(142 50% 45%)', fontWeight: 600 }}>Connected</span>
                        </>
                      ) : (
                        <span style={{ fontSize: 12, color: 'hsl(38 92% 55%)', fontWeight: 600 }}>Token expired — reconnect to sync</span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a href="/api/auth/instagram" style={{ textDecoration: 'none' }}>
                    <Button variant={profile.ig_access_token ? 'secondary' : 'default'} size="sm">
                      {profile.ig_access_token ? 'Reconnect' : 'Connect'}
                    </Button>
                  </a>
                  <Button variant="destructive" size="sm" onClick={handleDisconnectIG} disabled={disconnecting}>
                    {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.6, marginBottom: 14 }}>
                Connect your Instagram Business account to unlock analytics, weekly scripts, and AI coaching.
              </p>
              <a href="/api/auth/instagram" style={{ textDecoration: 'none', display: 'inline-block' }}>
                <Button size="sm" style={{ gap: 7 }}>
                  <IgIcon size={14} />
                  Connect Instagram
                </Button>
              </a>
            </div>
          )}
        </Card>

        {/* YouTube / TikTok */}
        <Card style={{ padding: 20 }}>
          <SectionLabel>Other Channels</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'YouTube', icon: <Video size={15} style={{ color: 'var(--muted-foreground)' }} /> },
              {
                label: 'TikTok', icon: (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2">
                    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                  </svg>
                ),
              },
            ].map(({ label, icon }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: 'var(--muted)', borderRadius: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {icon}
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{label}</div>
                </div>
                <Badge variant="muted">Coming soon</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Competitors */}
        <CompetitorManager />

        {/* Danger Zone */}
        <Card style={{ padding: 20, borderColor: 'hsl(0 70% 30%)' }}>
          <SectionLabel>Danger Zone</SectionLabel>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" onClick={handlePasswordReset}>
              Change Password
            </Button>
            <Button variant="destructive" size="sm" onClick={handleSignOut}>
              <LogOut size={13} />
              Sign out
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
