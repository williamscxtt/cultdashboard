import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import Sidebar from '@/components/dashboard/Sidebar'
import ImpersonationBanner from '@/components/dashboard/ImpersonationBanner'
import { Toaster } from 'sonner'
import { getImpersonatedId } from '@/lib/effective-user'
import type { Profile } from '@/lib/types'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: realProfile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!realProfile) redirect('/login')

  // Check impersonation (admin only)
  const impersonatingAs = realProfile.role === 'admin' ? await getImpersonatedId() : null

  // Fetch effective profile (impersonated client or own)
  let effectiveProfile: Profile = realProfile as Profile
  if (impersonatingAs) {
    const { data } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', impersonatingAs)
      .single()
    if (data) effectiveProfile = data as Profile
  }

  // Active check — only block real user, not impersonation target
  if (!realProfile.is_active && !impersonatingAs) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: 32, background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Account Inactive</div>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 13 }}>Your account has been deactivated. Contact Will to reactivate.</p>
        </div>
      </div>
    )
  }

  // Onboarding redirect — only for real client, not when impersonating
  if (!impersonatingAs && !realProfile.onboarding_completed && realProfile.role === 'client') {
    redirect('/onboarding')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      <Sidebar
        realProfile={realProfile as Profile}
        effectiveProfile={effectiveProfile}
        isImpersonating={!!impersonatingAs}
      />
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {impersonatingAs && (
          <ImpersonationBanner
            clientName={effectiveProfile.name || effectiveProfile.email || 'Client'}
          />
        )}
        {children}
      </main>
      <Toaster position="bottom-right" richColors />
    </div>
  )
}
