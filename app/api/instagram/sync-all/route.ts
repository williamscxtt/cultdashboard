import { NextRequest, NextResponse } from 'next/server'
import { authorizeInstagramSync } from '@/lib/instagram-sync-auth'
import { enqueueInstagramStatistics, processInstagramStatistics, instagramProviderHealth, instagramStatisticsStatus, consumeInstagramSyncInvocation } from '@/lib/instagram-statistics-sync'
import { validInstagramCronSignature } from '@/lib/instagram-cron-signature'
import { refreshLeaderboardInsights } from '@/lib/leaderboard-insights'

export const maxDuration = 180
export const dynamic = 'force-dynamic'

async function sync(enqueue: boolean, profileId?: string) {
  try {
    await instagramProviderHealth()
    const queued = enqueue ? await enqueueInstagramStatistics(profileId) : 0
    const result = await processInstagramStatistics()
    const insight = result.jobs.queued === 0 && result.jobs.running === 0 ? await refreshLeaderboardInsights() : {}
    return NextResponse.json({ queued, ...result, ...insight })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Instagram sync failed' }, { status: 502 })
  }
}

/** Vercel invokes cron routes with GET. Jobs are seeded once per UTC day. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const nonce = req.headers.get('x-instagram-sync-nonce')
  const bearer = Boolean(secret && req.headers.get('authorization') === `Bearer ${secret}`)
  const signed = secret && validInstagramCronSignature(secret, nonce,
    req.headers.get('x-instagram-sync-timestamp'), req.headers.get('x-instagram-sync-signature'))
  if (!bearer && (!signed || !nonce || !await consumeInstagramSyncInvocation(nonce))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return sync(new Date().getUTCHours() >= 6)
}

/** Admin-only manual catch-up, status and provider checks. */
export async function POST(req: NextRequest) {
  const denied = await authorizeInstagramSync()
  if (denied) return denied
  const body = await req.json().catch(() => ({})) as { action?: string; profileId?: string }
  if (body.profileId && !/^[0-9a-f-]{36}$/i.test(body.profileId)) {
    return NextResponse.json({ error: 'Invalid profileId' }, { status: 400 })
  }
  try {
    if (body.action === 'health') return NextResponse.json(await instagramProviderHealth())
    if (body.action === 'status') return NextResponse.json(await instagramStatisticsStatus())
    return sync(body.action !== 'drain', body.profileId)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Instagram sync failed' }, { status: 502 })
  }
}
