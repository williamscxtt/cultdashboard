'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import { Link2, Video, LogOut, Check } from 'lucide-react'

export default function SettingsForm({ profile }: { profile: Profile }) {
  const [name, setName] = useState(profile.name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Password change state
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState('')

  const router = useRouter()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ name })
      .eq('id', profile.id)

    if (error) {
      setError(error.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      router.refresh()
    }
    setSaving(false)
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return }
    if (newPw.length < 8) { setPwError('Password must be at least 8 characters'); return }
    setPwSaving(true); setPwError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) { setPwError(error.message); setPwSaving(false); return }
    setPwSaved(true)
    setNewPw('')
    setConfirmPw('')
    setTimeout(() => setPwSaved(false), 3000)
    setPwSaving(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const cardStyle = {
    background: '#ffffff',
    border: '1px solid #e8eaed',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Profile card */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 16px' }}>Profile</h2>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Full name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Email</label>
            <input
              type="email"
              value={profile.email ?? ''}
              disabled
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
            />
          </div>
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, color: '#dc2626',
            }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: saved ? '#f0fdf4' : '#cc0000',
              color: saved ? '#16a34a' : '#ffffff',
              border: saved ? '1px solid #bbf7d0' : 'none',
              borderRadius: 8, padding: '9px 20px',
              fontSize: 13, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              alignSelf: 'flex-start',
              transition: 'all 0.2s',
            }}
          >
            {saved && <Check size={14} />}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save changes'}
          </button>
        </form>
      </div>

      {/* Connected channels */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 16px' }}>Connected Channels</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Instagram */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            background: '#f9fafb', border: '1px solid #e8eaed', borderRadius: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link2 size={16} style={{ color: '#6b7280' }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Instagram</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>
                  {profile.ig_username ? `@${profile.ig_username}` : 'Not connected'}
                </div>
              </div>
            </div>
            {profile.ig_username ? (
              <span style={{
                fontSize: 11, fontWeight: 600,
                background: '#f0fdf4', color: '#16a34a',
                border: '1px solid #bbf7d0',
                padding: '3px 8px', borderRadius: 20,
              }}>
                Connected
              </span>
            ) : (
              <span style={{
                fontSize: 11, fontWeight: 500, color: '#9ca3af',
                background: '#f3f4f6', border: '1px solid #e5e7eb',
                padding: '3px 8px', borderRadius: 20,
              }}>
                Not connected
              </span>
            )}
          </div>

          {/* YouTube */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            background: '#f9fafb', border: '1px solid #e8eaed', borderRadius: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Video size={16} style={{ color: '#6b7280' }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>YouTube</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>
                  {profile.yt_channel_id ? profile.yt_channel_id : 'Not connected'}
                </div>
              </div>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 500, color: '#9ca3af',
              background: '#f3f4f6', border: '1px solid #e5e7eb',
              padding: '3px 8px', borderRadius: 20,
            }}>
              Coming soon
            </span>
          </div>

          {/* TikTok */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            background: '#f9fafb', border: '1px solid #e8eaed', borderRadius: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>TikTok</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>
                  {profile.tiktok_handle ? `@${profile.tiktok_handle}` : 'Not connected'}
                </div>
              </div>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 500, color: '#9ca3af',
              background: '#f3f4f6', border: '1px solid #e5e7eb',
              padding: '3px 8px', borderRadius: 20,
            }}>
              Coming soon
            </span>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 16px' }}>Change Password</h2>
        <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>New password</label>
            <input
              type="password"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Confirm new password</label>
            <input
              type="password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="Repeat your new password"
              autoComplete="new-password"
            />
          </div>
          {pwError && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, color: '#dc2626',
            }}>
              {pwError}
            </div>
          )}
          <button
            type="submit"
            disabled={pwSaving || !newPw}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: pwSaved ? '#f0fdf4' : '#cc0000',
              color: pwSaved ? '#16a34a' : '#ffffff',
              border: pwSaved ? '1px solid #bbf7d0' : 'none',
              borderRadius: 8, padding: '9px 20px',
              fontSize: 13, fontWeight: 600,
              cursor: (pwSaving || !newPw) ? 'not-allowed' : 'pointer',
              opacity: (pwSaving || !newPw) ? 0.6 : 1,
              alignSelf: 'flex-start',
              transition: 'all 0.2s',
            }}
          >
            {pwSaved && <Check size={14} />}
            {pwSaving ? 'Saving...' : pwSaved ? 'Password updated!' : 'Update password'}
          </button>
        </form>
      </div>

      {/* Account */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 16px' }}>Account</h2>
        <button
          onClick={handleSignOut}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'transparent', color: '#6b7280',
            border: '1px solid #e8eaed', borderRadius: 8,
            padding: '9px 16px', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', transition: 'background 0.1s, color 0.1s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = '#fef2f2'
            ;(e.currentTarget as HTMLElement).style.color = '#cc0000'
            ;(e.currentTarget as HTMLElement).style.borderColor = '#fecaca'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = '#6b7280'
            ;(e.currentTarget as HTMLElement).style.borderColor = '#e8eaed'
          }}
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </div>
  )
}
