'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import { Card, Badge, Button, PageHeader, SectionLabel } from '@/components/ui'
import { Video, LogOut, Eye, EyeOff, RefreshCw, AlertTriangle, Unlink } from 'lucide-react'
import { useIsMobile } from '@/lib/use-mobile'
import { toast } from 'sonner'

const BIANNUAL_LINK = 'https://buy.stripe.com/bJe28qcmWe970hMews9IQ1P'
const BOOK_CALL_URL = 'https://apply.scottvip.com'

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function BillingCard({ profile }: { profile: Profile }) {
  const planLabel = profile.plan_type === 'biannual' ? '6-Month Plan' : 'Monthly Plan'
  const planPrice = (() => {
    if (profile.plan_type === 'biannual') {
      const amt = profile.subscription_amount
      return amt ? `£${amt / 100} / 6 months` : '£997 / 6 months'
    }
    const amt = profile.subscription_amount
    if (amt) {
      const pounds = amt / 100
      return `£${Number.isInteger(pounds) ? pounds : pounds.toFixed(2)} / month`
    }
    return '£197 / month'
  })()
  const days = daysUntil(profile.subscription_period_end)
  const renewalDate = formatDate(profile.subscription_period_end)
  const isCreatorCult = profile.membership_tier === 'creator_cult'
  const hasSubscription = !!profile.subscription_status

  const statusColor = profile.subscription_status === 'active' || profile.subscription_status === 'trialing'
    ? 'hsl(142 71% 45%)'
    : profile.subscription_status === 'past_due' || profile.subscription_status === 'unpaid'
    ? 'hsl(38 92% 50%)'
    : profile.subscription_status === 'canceled'
    ? 'hsl(0 84% 60%)'
    : 'var(--muted-foreground)'

  const statusLabel = profile.subscription_status === 'trialing' ? 'Trial'
    : profile.subscription_status === 'active' ? 'Active'
    : profile.subscription_status === 'past_due' ? 'Past Due'
    : profile.subscription_status === 'canceled' ? 'Canceled'
    : 'No Sub'

  return (
    <Card style={{ padding: 20 }}>
      <SectionLabel>Plan &amp; Billing</SectionLabel>

      {/* Admin preview note */}
      {profile.role === 'admin' && !hasSubscription && (
        <div style={{
          fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 12,
          padding: '6px 10px', borderRadius: 6,
          background: 'var(--muted)', border: '1px solid var(--border)',
        }}>
          Admin preview — clients with active subscriptions see this section.
        </div>
      )}

      {/* Current plan summary */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderRadius: 10,
        background: 'var(--muted)', border: '1px solid var(--border)',
        marginBottom: 16,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', marginBottom: 2 }}>
            {isCreatorCult ? 'Creator Cult — Full Programme' : planLabel}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
            {isCreatorCult ? 'Lifetime dashboard access included' : hasSubscription ? planPrice : 'No active subscription'}
          </div>
        </div>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
          color: statusColor, background: `${statusColor}18`,
          border: `1px solid ${statusColor}40`,
          borderRadius: 5, padding: '3px 8px',
        }}>
          {statusLabel}
        </div>
      </div>

      {/* Renewal info */}
      {!isCreatorCult && profile.subscription_period_end && (
        <div style={{
          fontSize: 13, color: 'var(--muted-foreground)',
          marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          Next renewal: <strong style={{ color: 'var(--foreground)' }}>{renewalDate}</strong>
          {days !== null && <span style={{ color: 'var(--muted-foreground)' }}>({days} day{days !== 1 ? 's' : ''} away)</span>}
        </div>
      )}

      {/* Upgrade to biannual — only for monthly subscribers */}
      {!isCreatorCult && profile.plan_type === 'monthly' && (
        <div style={{
          padding: '14px 16px', borderRadius: 10,
          background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)',
          marginBottom: 16,
        }}>
          {(() => {
            const monthlyPence = profile.subscription_amount ?? 19700
            const sixMonths = monthlyPence * 6 / 100
            const saving = Math.round(sixMonths - 997)
            return (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', marginBottom: 4 }}>
                  Switch to 6 months — save £{saving}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 12, lineHeight: 1.5 }}>
                  Pay £997 every 6 months instead of {planPrice}. That&apos;s a saving of £{saving} — same tools, same access, locked in.
                </div>
              </>
            )
          })()}
          <a
            href={BIANNUAL_LINK}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 700, color: '#ffffff',
              background: '#3b82f6', borderRadius: 6,
              padding: '8px 14px', textDecoration: 'none',
              cursor: 'pointer', transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Upgrade to 6 months →
          </a>
        </div>
      )}

      {/* Creator Cult upsell — for dashboard-only members */}
      {!isCreatorCult && (
        <div style={{
          padding: '14px 16px', borderRadius: 10,
          background: 'rgba(226,201,126,0.05)', border: '1px solid rgba(226,201,126,0.2)',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase',
            color: '#e2c97e', marginBottom: 8,
          }}>
            Full Creator Cult
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', marginBottom: 4 }}>
            Want Will coaching you every week?
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 12, lineHeight: 1.5 }}>
            Full Creator Cult adds the complete 5-phase course, live weekly group coaching, 1-to-1 support, and the private Circle community — everything around the tools you already have.
          </div>
          <a
            href={BOOK_CALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 700, color: '#0d0d0a',
              background: '#e2c97e', borderRadius: 6,
              padding: '8px 14px', textDecoration: 'none',
              cursor: 'pointer', transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Apply for Creator Cult →
          </a>
        </div>
      )}
    </Card>
  )
}

// Official Instagram gradient logo
function InstagramLogo({ size = 36 }: { size?: number }) {
  const id = 'ig-grad'
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <defs>
        <radialGradient id={id} cx="30%" cy="107%" r="150%">
          <stop offset="0%"  stopColor="#fdf497"/>
          <stop offset="5%"  stopColor="#fdf497"/>
          <stop offset="45%" stopColor="#fd5949"/>
          <stop offset="60%" stopColor="#d6249f"/>
          <stop offset="90%" stopColor="#285AEB"/>
        </radialGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="13" fill={`url(#${id})`}/>
      <circle cx="24" cy="24" r="9" stroke="white" strokeWidth="3" fill="none"/>
      <circle cx="34.5" cy="13.5" r="2.5" fill="white"/>
    </svg>
  )
}

export default function SettingsClient({ profile, isImpersonating = false }: { profile: Profile; isImpersonating?: boolean }) {
  const isMobile = useIsMobile()
  const [name, setName] = useState(profile.name || '')
  const [saving, setSaving] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  // Instagram username editing
  const [igUsername, setIgUsername] = useState(profile.ig_username || '')
  const [savingIg, setSavingIg] = useState(false)
  const [editingIg, setEditingIg] = useState(!profile.ig_username)
  // Instagram disconnect
  const [disconnecting, setDisconnecting] = useState(false)
  // Delete account — 3-step
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2 | 3>(0)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)
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

  async function handleDisconnectInstagram() {
    setDisconnecting(true)
    try {
      const res = await fetch('/api/instagram/disconnect', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to disconnect')
      toast.success('Instagram disconnected')
      setIgUsername('')
      setEditingIg(true)
      router.refresh()
    } catch { toast.error('Failed to disconnect Instagram') }
    setDisconnecting(false)
  }

  async function handleSaveInstagram(e: React.FormEvent) {
    e.preventDefault()
    setSavingIg(true)
    try {
      const res = await fetch('/api/profile/update-instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ig_username: igUsername }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save')

      if (json.ig_username) {
        if (json.wiped) {
          // Username changed — trigger a fresh sync
          toast.success(`Switched to @${json.ig_username} — syncing data…`)
          fetch('/api/instagram/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profileId: profile.id }),
          }).catch(() => {})
        } else {
          toast.success(`Instagram set to @${json.ig_username}`)
        }
      } else {
        toast.success('Instagram username cleared')
      }
      setEditingIg(false)
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save Instagram username')
    }
    setSavingIg(false)
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      const res = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE' }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to delete account')
      }
      toast.success('Account deleted')
      router.push('/login')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete account')
    }
    setDeleting(false)
  }

  return (
    <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: 640, margin: '0 auto' }}>
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

        {/* Plan & Billing */}
        {(profile.role === 'admin' || profile.subscription_status) && (
          <BillingCard profile={profile} />
        )}

        {/* Instagram */}
        <Card style={{ padding: 20 }}>
          <SectionLabel>Instagram</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ marginTop: 1 }}>
              <InstagramLogo size={36} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {editingIg ? (
                <form onSubmit={handleSaveInstagram} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>
                      Instagram username
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{
                        position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                        fontSize: 13, color: 'var(--muted-foreground)', pointerEvents: 'none', userSelect: 'none',
                      }}>@</span>
                      <input
                        type="text"
                        value={igUsername}
                        onChange={e => setIgUsername(e.target.value.replace(/^@+/, ''))}
                        placeholder="yourhandle"
                        autoFocus
                        style={{ paddingLeft: 24 }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button type="submit" size="sm" disabled={savingIg}>
                      {savingIg ? 'Saving…' : 'Save'}
                    </Button>
                    {profile.ig_username && (
                      <Button type="button" variant="secondary" size="sm" onClick={() => { setIgUsername(profile.ig_username || ''); setEditingIg(false) }}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              ) : (
                <>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>
                    @{profile.ig_username}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    <RefreshCw size={10} style={{ color: 'rgba(255,255,255,0.55)' }} />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                      Synced automatically every day
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <Button variant="secondary" size="sm" onClick={() => setEditingIg(true)}>
                      Change username
                    </Button>
                    {!isImpersonating && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleDisconnectInstagram}
                        disabled={disconnecting}
                      >
                        <Unlink size={12} />
                        {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                      </Button>
                    )}
                  </div>
                </>
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

        {/* Danger Zone — hidden when viewing as a client */}
        {!isImpersonating && (
          <Card style={{ padding: 20, border: '1px solid hsl(0 70% 40% / 0.35)' }}>
            <SectionLabel>Danger Zone</SectionLabel>

            {deleteStep === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.6, margin: 0 }}>
                  Deleting your account is permanent and cannot be undone. All your data, reels, scripts, and settings will be removed.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="destructive" size="sm" onClick={() => setDeleteStep(1)}>
                    <AlertTriangle size={12} />
                    Delete my account
                  </Button>
                </div>
              </div>
            )}

            {deleteStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{
                  padding: '12px 14px', borderRadius: 8,
                  background: 'hsl(0 70% 40% / 0.08)', border: '1px solid hsl(0 70% 40% / 0.2)',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'hsl(0 65% 45%)', marginBottom: 4 }}>
                    Are you sure?
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.6, margin: 0 }}>
                    This will permanently delete your account, all your content data, competitor lists, AI conversations, and scripts. This cannot be reversed.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="destructive" size="sm" onClick={() => setDeleteStep(2)}>
                    Yes, I understand — continue
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setDeleteStep(0)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {deleteStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.6, margin: 0 }}>
                  Type <strong style={{ color: 'var(--foreground)' }}>DELETE</strong> to confirm you want to permanently delete your account.
                </p>
                <input
                  type="text"
                  value={deleteInput}
                  onChange={e => setDeleteInput(e.target.value)}
                  placeholder="Type DELETE here"
                  autoFocus
                  style={{ borderColor: deleteInput === 'DELETE' ? 'hsl(0 65% 50%)' : undefined }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleteInput !== 'DELETE'}
                    onClick={() => { setDeleteStep(3) }}
                  >
                    Confirm — delete my account
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => { setDeleteStep(0); setDeleteInput('') }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {deleteStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{
                  padding: '12px 14px', borderRadius: 8,
                  background: 'hsl(0 70% 40% / 0.08)', border: '1px solid hsl(0 70% 40% / 0.3)',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'hsl(0 65% 45%)', marginBottom: 4 }}>
                    Final confirmation
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.6, margin: 0 }}>
                    One last chance. Click the button below to permanently and irreversibly delete your account. There is no recovery.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleting}
                    onClick={handleDeleteAccount}
                  >
                    <AlertTriangle size={12} />
                    {deleting ? 'Deleting…' : 'Delete account permanently'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => { setDeleteStep(0); setDeleteInput('') }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
