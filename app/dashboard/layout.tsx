import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Sidebar from '@/components/dashboard/Sidebar'
import { Toaster } from 'sonner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  if (!profile.is_active) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: 32, background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Account Inactive</div>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 13 }}>Your account has been deactivated. Contact Will to reactivate.</p>
        </div>
      </div>
    )
  }

  if (!profile.onboarding_completed && profile.role === 'client') redirect('/onboarding')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      <Sidebar profile={profile} />
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {children}
      </main>
      <Toaster position="bottom-right" richColors />
    </div>
  )
}
