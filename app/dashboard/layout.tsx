import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import DashboardShell from '@/components/dashboard/DashboardShell'
import { SyncProgressProvider } from '@/components/dashboard/SyncProgress'
import { Toaster } from 'sonner'
import { getImpersonatedId } from '@/lib/effective-user'
import { isSubscriptionActive } from '@/lib/stripe'
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

  const impersonatingAs = realProfile.role === 'admin' ? await getImpersonatedId() : null

  let effectiveProfile: Profile = realProfile as Profile
  if (impersonatingAs) {
    const { data } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', impersonatingAs)
      .single()
    if (data) effectiveProfile = data as Profile
  }

  // ── Subscription gate (clients only, not admins, not impersonation sessions) ──
  const isAdmin = realProfile.role === 'admin'
  if (!isAdmin && !impersonatingAs) {
    const status = realProfile.subscription_status as string | null | undefined
    if (!isSubscriptionActive(status)) {
      const isPastDue = status === 'past_due' || status === 'unpaid'
      redirect(`/subscribe${isPastDue ? '?past_due=1' : ''}`)
    }
  }

  if (!realProfile.is_active && !impersonatingAs) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background)',
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: 400,
          padding: 32,
          background: 'var(--card)',
          borderRadius: 12,
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, fontFamily: 'var(--font-display)' }}>
            Account Inactive
          </div>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 13 }}>
            Your account has been deactivated. Contact Will to reactivate.
          </p>
        </div>
      </div>
    )
  }

  // No redirect needed — new signups land on /dashboard/onboarding via auth callback,
  // and the sidebar lock handles the profile completion requirement.
  // Removing the old redirect prevents an infinite loop since /dashboard/onboarding
  // is itself inside this layout.

  return (
    <SyncProgressProvider>
      <DashboardShell
        realProfile={realProfile as Profile}
        effectiveProfile={effectiveProfile}
        isImpersonating={!!impersonatingAs}
      >
        {children}
      </DashboardShell>
      <Toaster position="bottom-right" richColors />
    </SyncProgressProvider>
  )
}
