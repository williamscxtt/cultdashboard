import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import type { Profile, ClientReel } from '@/lib/types'
import Link from 'next/link'
import ClientDetailActions from '@/components/dashboard/ClientDetailActions'
import ClientDetailTabs from '@/components/dashboard/ClientDetailTabs'
import AdminClientOverview from '@/components/dashboard/AdminClientOverview'
import PathSwitcher from '@/components/dashboard/PathSwitcher'
import { Card, Badge } from '@/components/ui'
import { ArrowLeft } from 'lucide-react'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (adminProfile?.role !== 'admin') redirect('/dashboard')

  const { data: clientProfile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!clientProfile || clientProfile.role !== 'client') redirect('/dashboard/clients')

  const [{ data: reels }, { data: weeklyLogs }, { data: dmSales }, { data: followerSnapshots }] = await Promise.all([
    adminClient
      .from('client_reels')
      .select('*')
      .eq('profile_id', id)
      .order('date', { ascending: false }),
    adminClient
      .from('weekly_log')
      .select('*')
      .eq('profile_id', id)
      .order('week_start', { ascending: false })
      .limit(8),
    adminClient
      .from('dm_sales')
      .select('id, lead_name, stage, call_booked, call_completed, closed, revenue, deal_value, date')
      .eq('profile_id', id)
      .order('date', { ascending: false })
      .limit(100),
    adminClient
      .from('follower_snapshots')
      .select('date, count')
      .eq('profile_id', id)
      .order('date', { ascending: true })
      .limit(90),
  ])

  const reelData = (reels ?? []) as ClientReel[]
  const profile = clientProfile as Profile
  const callTranscripts = (clientProfile.call_transcripts ?? []) as Array<{ id: string; label: string; content: string; added_at: string }>
  const roadmapGeneratedAt = (clientProfile.roadmap_generated_at as string | null) ?? null

  const overviewContent = (
    <AdminClientOverview
      profile={profile}
      reels={reelData}
      weeklyLogs={(weeklyLogs ?? []) as Parameters<typeof AdminClientOverview>[0]['weeklyLogs']}
      dmSales={(dmSales ?? []) as Parameters<typeof AdminClientOverview>[0]['dmSales']}
    />
  )

  return (
    <div style={{ padding: '16px', maxWidth: 1024, margin: '0 auto' }}>
      {/* Admin banner */}
      <Card style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <Link
          href="/dashboard/clients"
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted-foreground)', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}
        >
          <ArrowLeft size={13} />
          Clients
        </Link>
        <div style={{ width: 1, height: 14, background: 'var(--border)' }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
          {profile.name || 'Unnamed Client'}
        </div>
        {profile.ig_username && (
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>@{profile.ig_username}</div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <PathSwitcher
            profileId={profile.id}
            currentType={profile.user_type ?? null}
            currentStyle={profile.creator_style ?? null}
            mode="admin"
            variant="badge"
          />
          <Badge variant={profile.is_active ? 'success' : 'muted'}>
            {profile.is_active ? 'Active' : 'Inactive'}
          </Badge>
          <ClientDetailActions
            clientId={profile.id}
            clientName={profile.name || profile.email || 'Client'}
            isActive={profile.is_active}
            dmKeyword={(clientProfile as Record<string, unknown>).dm_keyword as string | null}
          />
        </div>
      </Card>

      {/* Tabbed content */}
      <ClientDetailTabs
        profile={profile}
        overviewContent={overviewContent}
        callTranscripts={callTranscripts}
        roadmapGeneratedAt={roadmapGeneratedAt}
      />
    </div>
  )
}
