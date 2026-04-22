import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import type { Profile, ClientReel, CircleActivityCache, CircleActionItem } from '@/lib/types'
import Link from 'next/link'
import AnalyticsCharts from '@/components/dashboard/AnalyticsCharts'
import ScriptCards from '@/components/dashboard/ScriptCards'
import ClientDetailActions from '@/components/dashboard/ClientDetailActions'
import ClientDetailTabs from '@/components/dashboard/ClientDetailTabs'
import { Card, Badge, StatCard, EmptyState } from '@/components/ui'
import { ArrowLeft, FileText } from 'lucide-react'

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

  const [
    { data: reels },
    { data: weeklyScript },
    { data: followerSnapshots },
    { data: circleCache },
    { data: circlePendingItems },
  ] = await Promise.all([
    adminClient
      .from('client_reels')
      .select('*')
      .eq('profile_id', id)
      .order('date', { ascending: false }),
    adminClient
      .from('weekly_scripts')
      .select('*')
      .eq('profile_id', id)
      .order('week_start', { ascending: false })
      .limit(1)
      .single(),
    adminClient
      .from('follower_snapshots')
      .select('date, count')
      .eq('profile_id', id)
      .order('date', { ascending: true })
      .limit(90),
    adminClient
      .from('circle_activity_cache')
      .select('*')
      .eq('profile_id', id)
      .single(),
    adminClient
      .from('circle_action_items')
      .select('*')
      .eq('profile_id', id)
      .eq('status', 'pending')
      .order('generated_at', { ascending: false }),
  ])

  const reelData = (reels ?? []) as ClientReel[]

  const formatGroups: Record<string, number[]> = {}
  reelData.forEach(r => {
    if (r.format_type) {
      if (!formatGroups[r.format_type]) formatGroups[r.format_type] = []
      formatGroups[r.format_type].push(r.views ?? 0)
    }
  })

  const totalReels = reelData.length
  const avgViews = totalReels
    ? Math.round(reelData.reduce((a, r) => a + (r.views ?? 0), 0) / totalReels)
    : 0
  const avgEngagement = totalReels && reelData.reduce((a, r) => a + (r.views ?? 0), 0) > 0
    ? (reelData.reduce((a, r) => a + (r.likes ?? 0) + (r.comments ?? 0), 0) /
       reelData.reduce((a, r) => a + (r.views ?? 0), 0) * 100).toFixed(1)
    : '0.0'
  const bestFormat = Object.entries(formatGroups)
    .map(([fmt, views]) => ({ fmt, avg: views.reduce((a, b) => a + b, 0) / views.length }))
    .sort((a, b) => b.avg - a.avg)[0]?.fmt ?? '—'

  const profile = clientProfile as Profile

  const callTranscripts = (clientProfile.call_transcripts ?? []) as Array<{ id: string; label: string; content: string; added_at: string }>
  const roadmapGeneratedAt = (clientProfile.roadmap_generated_at as string | null) ?? null

  const overviewContent = (
    <>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Reels" value={totalReels.toString()} />
        <StatCard label="Avg Views" value={totalReels ? avgViews.toLocaleString() : '—'} />
        <StatCard label="Avg Engagement" value={totalReels ? `${avgEngagement}%` : '—'} />
        <StatCard label="Best Format" value={bestFormat} />
      </div>

      <AnalyticsCharts reels={reelData} formatGroups={formatGroups} followerSnapshots={followerSnapshots ?? []} />

      {/* Scripts */}
      <div style={{ marginTop: 28 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.3px', fontFamily: 'var(--font-display)' }}>
            Latest Scripts
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>
            {weeklyScript
              ? `Week of ${new Date(weeklyScript.week_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
              : 'No scripts generated yet.'}
          </div>
        </div>
        {weeklyScript ? (
          <ScriptCards scriptsMd={weeklyScript.scripts_md} />
        ) : (
          <Card>
            <EmptyState
              icon={<FileText size={18} />}
              title="No scripts yet"
              description="Scripts will appear here once the weekly runner has run for this client."
            />
          </Card>
        )}
      </div>
    </>
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
        circleCache={(circleCache ?? null) as CircleActivityCache | null}
        circlePendingItems={(circlePendingItems ?? []) as CircleActionItem[]}
      />
    </div>
  )
}
