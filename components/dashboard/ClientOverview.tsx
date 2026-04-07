'use client'
import Link from 'next/link'
import type { Profile } from '@/lib/types'
import { Card, StatCard, PageHeader, Button } from '@/components/ui'

interface Reel {
  views: number
  likes: number
  comments: number
  format_type: string
  date: string
}

interface Props {
  profile: Profile
  reels: Reel[]
  latestScript: { week_start: string; script_count: number } | null
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const QUICK_PROMPTS = [
  "Why aren't my reels getting views?",
  "What should I post this week?",
  "How do I write a better hook?",
  "How do I grow faster on Instagram?",
]

export default function ClientOverview({ profile, reels, latestScript }: Props) {
  const firstName = profile.name?.split(' ')[0] || 'there'

  const avgViews = reels.length
    ? Math.round(reels.reduce((a, r) => a + r.views, 0) / reels.length)
    : null

  const engagementRate = reels.length && reels.reduce((a, r) => a + r.views, 0) > 0
    ? (
        reels.reduce((a, r) => a + r.likes + r.comments, 0) /
        reels.reduce((a, r) => a + r.views, 0) * 100
      ).toFixed(1)
    : null

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div style={{ padding: '24px', maxWidth: 1024, margin: '0 auto' }}>
      <PageHeader
        title={`${getGreeting()}, ${firstName}`}
        description={today}
      />

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard
          label="Followers"
          value={profile.ig_username ? '—' : 'Not connected'}
          sub={profile.ig_username ? `@${profile.ig_username}` : 'Connect in Settings'}
        />
        <StatCard
          label="Avg Views"
          value={avgViews !== null ? avgViews.toLocaleString() : '—'}
          sub={reels.length ? `${reels.length} recent reels` : 'No data yet'}
        />
        <StatCard
          label="Engagement"
          value={engagementRate !== null ? `${engagementRate}%` : '—'}
          sub="Likes + comments / views"
        />
        <StatCard
          label="Reels This Week"
          value={latestScript?.script_count ?? '—'}
          sub={latestScript ? `Week of ${new Date(latestScript.week_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'Scripts drop Mondays'}
        />
      </div>

      {/* Feature cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Scripts card */}
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            This Week&apos;s Scripts
          </div>
          {latestScript ? (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.5px', lineHeight: 1, marginBottom: 4 }}>
                {latestScript.script_count}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
                scripts ready for week of{' '}
                {new Date(latestScript.week_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '-0.5px', lineHeight: 1, marginBottom: 4 }}>—</div>
              <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Generate scripts Monday</div>
            </div>
          )}
          <Link href="/dashboard/scripts" style={{ textDecoration: 'none' }}>
            <Button size="sm">View Scripts</Button>
          </Link>
        </Card>

        {/* Ask Will AI card */}
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Ask Will AI
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 14, lineHeight: 1.6 }}>
            Get personalized advice on your content strategy, hooks, and growth.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {QUICK_PROMPTS.slice(0, 3).map(prompt => (
              <Link
                key={prompt}
                href={`/dashboard/ai?q=${encodeURIComponent(prompt)}`}
                style={{
                  display: 'block', padding: '7px 10px', borderRadius: 6,
                  background: 'var(--muted)', color: 'var(--foreground)',
                  fontSize: 12, fontWeight: 500, textDecoration: 'none',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
              >
                {prompt}
              </Link>
            ))}
          </div>
          <Link href="/dashboard/ai" style={{ textDecoration: 'none' }}>
            <Button size="sm" variant="secondary">Open Chat</Button>
          </Link>
        </Card>
      </div>
    </div>
  )
}
