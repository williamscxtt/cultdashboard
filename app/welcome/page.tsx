import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import Link from 'next/link'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Shown only if session_id is missing or something goes wrong
function FallbackPage() {
  return (
    <div style={{
      minHeight: '100vh', background: '#0d0d0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: 16 }}>
          Payment Confirmed
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#ffffff', letterSpacing: '-.03em', lineHeight: 1.15, marginBottom: 16 }}>
          Welcome to<br />Creator Cult.
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginBottom: 32 }}>
          Check your inbox — we&apos;ve sent you a link to set up your account and get straight into onboarding.
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginBottom: 24 }}>
          Didn&apos;t get it? Check spam, or{' '}
          <a href="https://instagram.com/willscxtt" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>
            DM Will on Instagram
          </a>.
        </p>
        <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>
          Already have an account? Log in →
        </Link>
      </div>
    </div>
  )
}

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams

  if (!session_id) return <FallbackPage />

  try {
    // 1. Fetch Stripe session to get customer email
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['customer_details'],
    })

    const email = session.customer_details?.email ?? session.customer_email
    const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id

    if (!email) return <FallbackPage />

    // 2. Generate a magic link — creates the user if they don't exist yet
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cultdashboard.com'
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${siteUrl}/onboarding` },
    })

    if (linkError || !linkData?.properties?.action_link) {
      console.error('[welcome] generateLink error:', linkError)
      return <FallbackPage />
    }

    // 3. Upsert profile (user is guaranteed to exist now)
    await adminClient.from('profiles').upsert({
      id: linkData.user.id,
      email,
      role: 'client',
      is_active: true,
      membership_tier: 'dashboard',
      stripe_customer_id: stripeCustomerId ?? null,
      date_joined: new Date().toISOString().split('T')[0],
    }, { onConflict: 'id', ignoreDuplicates: false })

    // 4. Redirect straight to the magic link — logs them in instantly
    redirect(linkData.properties.action_link)

  } catch (err) {
    console.error('[welcome] error:', err)
    return <FallbackPage />
  }
}
