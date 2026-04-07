import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import type { Profile, ClientReel } from '@/lib/types'
import Link from 'next/link'
import AnalyticsCharts from '@/components/dashboard/AnalyticsCharts'
import ScriptCards from '@/components/dashboard/ScriptCards'
import { Card, Badge, StatCard, PageHeader, EmptyState } from '@/components/ui'
import { ArrowLeft, FileText } from 'lucide-react'

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

  const { data: clientProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!clientProfile || clientProfile.role !== 'client') redirect('/dashboard/clients')

  const { data: reels } = await supabase
    .from('client_reels')
    .select('*')
    .eq('profile_id', id)
    .order('date', { ascending: false })

  const { data: weeklyScript } = await supabase
    .from('weekly_scripts')
    .select('*')
    .eq('profile_id', id)
    .order('week_start', { ascending: false })
    .limit(1)
    .single()

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

  return (
    <div style={{ padding: '24px', maxWidth: 1024, margin: '0 auto' }}>
      {/* Admin banner */}
      <Card style={{
        padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
      }}>
        <Link
          href="/dashboard/clients"
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted-foreground)', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}
        >
          <ArrowLeft size={13} />
          Back
        </Link>
        <div style={{ width: 1, height: 14, background: 'var(--border)' }} />
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Admin View
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>
          {profile.name || 'Unnamed Client'}
        </div>
        {profile.ig_username && (
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>@{profile.ig_username}</div>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <Badge variant={profile.is_active ? 'success' : 'muted'}>
            {profile.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </Card>

      <PageHeader
        title={`${profile.name || 'Client'}'s Dashboard`}
        description={profile.email ?? undefined}
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Reels" value={totalReels.toString()} />
        <StatCard label="Avg Views" value={totalReels ? avgViews.toLocaleString() : '—'} />
        <StatCard label="Avg Engagement" value={totalReels ? `${avgEngagement}%` : '—'} />
        <StatCard label="Best Format" value={bestFormat} />
      </div>

      <AnalyticsCharts reels={reelData} formatGroups={formatGroups} />

      {/* Scripts */}
      <div style={{ marginTop: 28 }}>
        <PageHeader
          title="Latest Scripts"
          description={weeklyScript
            ? `Week of ${new Date(weeklyScript.week_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
            : 'No scripts generated yet.'}
        />
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
    </div>
  )
}
