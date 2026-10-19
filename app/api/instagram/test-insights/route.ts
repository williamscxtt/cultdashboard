import { NextResponse } from 'next/server'
import { instagramAdmin, instagramConnectionToken, instagramGraph, requireInstagramPilot } from '@/lib/instagram-connection'

export async function GET() {
  try {
    const { user, profile } = await requireInstagramPilot()
    const { token, instagramUserId } = await instagramConnectionToken(user.id, profile.ig_username)
    const until = Math.floor(Date.now() / 1000), since = until - 30 * 86400
    const metrics: Record<string, { value: number | null; available: boolean }> = {}
    // Unavailable data must never become zero. Test each metric independently.
    for (const metric of ['views', 'reach']) {
      try {
        const result = await instagramGraph(instagramUserId + '/insights', token, { metric, period: 'day', metric_type: 'total_value', since: String(since), until: String(until) })
        const value = result.data?.find((item: { name: string }) => item.name === metric)?.total_value?.value
        metrics[metric] = { value: typeof value === 'number' && Number.isFinite(value) ? value : null, available: typeof value === 'number' && Number.isFinite(value) }
      } catch { metrics[metric] = { value: null, available: false } }
    }
    const account = await instagramGraph('me', token, { fields: 'username,followers_count,media_count' })
    const { error } = await instagramAdmin().from('instagram_connections').update({ last_checked_at: new Date().toISOString(), last_error: Object.values(metrics).every(metric => !metric.available) ? 'insights_unavailable' : null }).eq('profile_id', user.id)
    if (error) throw new Error('storage')
    return NextResponse.json({ source: 'instagram_official', since: new Date(since * 1000).toISOString(), until: new Date(until * 1000).toISOString(), username: account.username, followers: account.followers_count ?? null, totalPosts: account.media_count ?? null, metrics }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const code = ['unauthorized', 'pilot_only', 'impersonating', 'reconnect_required'].includes(message) ? message : 'check_failed'
    return NextResponse.json({ error: code }, { status: code === 'unauthorized' ? 401 : code === 'check_failed' ? 502 : 403, headers: { 'Cache-Control': 'no-store' } })
  }
}
