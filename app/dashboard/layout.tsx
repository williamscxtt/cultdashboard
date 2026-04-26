import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import DashboardShell from '@/components/dashboard/DashboardShell'
import { SyncProgressProvider } from '@/components/dashboard/SyncProgress'
import { Toaster } from 'sonner'
import { getImpersonatedId } from '@/lib/effective-user'
import { stripe, isSubscriptionActive } from '@/lib/stripe'
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
  if (!isAdmin && !impersonatingAs && !realProfile.billing_exempt) {
    let status = realProfile.subscription_status as string | null | undefined

    // Race condition fix: Stripe redirects to /dashboard before the webhook fires.
    // If status is still null but the client has a stripe_customer_id, check Stripe
    // directly and update the DB so they're not bounced back to /subscribe immediately.
    if (!isSubscriptionActive(status) && realProfile.stripe_customer_id && status == null) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: realProfile.stripe_customer_id as string,
          limit: 1,
          status: 'all',
        })
        const latest = subscriptions.data[0]
        if (latest && isSubscriptionActive(latest.status)) {
          // Webhook hasn't landed yet — persist what Stripe knows and continue
          const periodEnd = latest.items?.data?.[0]?.current_period_end ?? null
          await adminClient
            .from('profiles')
            .update({
              stripe_subscription_id: latest.id,
              subscription_status: latest.status,
              subscription_period_end: periodEnd
                ? new Date(periodEnd * 1000).toISOString()
                : null,
              subscription_trial_end: latest.trial_end
                ? new Date(latest.trial_end * 1000).toISOString()
                : null,
            })
            .eq('id', realProfile.id)
          status = latest.status
        }
      } catch {
        // Stripe check failed — fall through to the normal gate below
      }
    }

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
