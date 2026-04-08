'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import { Card, Badge, Button, PageHeader, SectionLabel } from '@/components/ui'
import { Video, LogOut, Eye, EyeOff, RefreshCw } from 'lucide-react'
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

export default function SettingsClient({ profile, isImpersonating = false }: { profile: Profile; isImpersonating?: boolean }) {
  const [name, setName] = useState(profile.name || '')
  const [saving, setSaving] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const router = useRouter()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ name }).eq('id', profile.id)
    if (error) toast.error(error.message)
    else { toast.success('Profile saved!'); router.refresh() }
    setSaving(false)
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    setChangingPassword(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password changed successfully!')
      setShowPasswordForm(false)
      setNewPassword('')
      setConfirmPassword('')
    }
    setChangingPassword(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IgIcon size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {profile.ig_username ? (
                <>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>
                    @{profile.ig_username}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    <RefreshCw size={10} style={{ color: 'hsl(142 50% 45%)' }} />
                    <span style={{ fontSize: 12, color: 'hsl(142 50% 45%)', fontWeight: 600 }}>
                      Synced automatically every Monday
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
                  No account linked. Contact Will to connect your Instagram.
                </div>
              )}
            </div>
          </div>
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

        {/* Security — hidden when viewing as a client */}
        {!isImpersonating && (
          <Card style={{ padding: 20 }}>
            <SectionLabel>Security</SectionLabel>
            {!showPasswordForm ? (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Button variant="secondary" size="sm" onClick={() => setShowPasswordForm(true)}>
                  Change Password
                </Button>
                <Button variant="destructive" size="sm" onClick={handleSignOut}>
                  <LogOut size={13} />
                  Sign out
                </Button>
              </div>
            ) : (
              <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>New password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      autoFocus
                      style={{ paddingRight: 36 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(v => !v)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}
                    >
                      {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>Confirm new password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPw ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      style={{ paddingRight: 36 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(v => !v)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}
                    >
                      {showConfirmPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button type="submit" size="sm" disabled={changingPassword}>
                    {changingPassword ? 'Saving…' : 'Save new password'}
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => { setShowPasswordForm(false); setNewPassword(''); setConfirmPassword('') }}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </Card>
        )}

        {/* Sign Out — hidden when viewing as a client */}
        {!isImpersonating && (
          <Card style={{ padding: 20, borderColor: 'hsl(0 70% 30%)' }}>
            <SectionLabel>Danger Zone</SectionLabel>
            <Button variant="destructive" size="sm" onClick={handleSignOut}>
              <LogOut size={13} />
              Sign out
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
