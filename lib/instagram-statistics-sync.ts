import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { canUseDashboard } from '@/lib/dashboard-access'
import { linkedSkoolCreators, type SkoolLeaderboardCreator } from '@/lib/leaderboard-roster'
import { instagramUsername, statistic, profileFollowers, profilePostCache, terminalInstagramData, statisticsReels, statisticsPosts, statisticsWindow, reelStatisticsUpdate, statisticsJobState, statisticsRetryDelay, statisticsPostRefreshStart, statisticsReelRefreshStart, canUseHybridStatistics, normaliseCheapStatistics, statisticsGaps, type StatisticsPlan } from '@/lib/instagram-statistics'

const APIFY = 'https://api.apify.com/v2'
const MAX_ATTEMPTS = 3
type Kind = 'profile' | 'reels'
type Job = {
  id: string; sync_date: string; username: string; profile_ids: string[]
  status: string; lease_token: string
  profile_run_id: string | null; reels_run_id: string | null
  profile_done: boolean; reels_done: boolean
  posts_done: boolean; post_history_complete: boolean
  profile_attempts: number; reels_attempts: number
  last_error: string | null; reel_count: number | null
  statistics_plan: StatisticsPlan | null
}
type Run = { id: string; status: string; defaultDatasetId: string; finishedAt?: string }

function database() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function consumeInstagramSyncInvocation(nonce: string) {
  const { data, error } = await database().rpc('consume_instagram_sync_invocation', { invocation_nonce: nonce })
  return !error && data === true
}

async function apify(path: string, input?: Record<string, unknown>) {
  const token = process.env.APIFY_API_TOKEN
  if (!token) throw new Error('APIFY_API_TOKEN is not configured')
  const response = await fetch(APIFY + path, {
    method: input ? 'POST' : 'GET', cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(input ? { body: JSON.stringify(input) } : {}),
    signal: AbortSignal.timeout(20000),
  })
  if (!response.ok) {
    const detail = await response.json().catch(() => null) as { error?: { type?: unknown; message?: unknown } } | null
    const type = detail?.error?.type
    // Provider error codes explain quota and permission failures without logging credentials or raw responses.
    const code = typeof type === 'string' && /^[a-z0-9_-]{1,80}$/.test(type) ? `: ${type}` : ''
    const message = type === 'platform-feature-disabled' && typeof detail?.error?.message === 'string'
      ? detail.error.message.replace(/apify_api_[a-z0-9_-]+|Bearer\s+\S+|https?:\/\/\S+/gi, '[redacted]').slice(0, 240) : ''
    throw new Error(`Apify request failed (HTTP ${response.status}${code})${message ? `: ${message}` : ''}`)
  }
  return response.json()
}

export async function instagramProviderHealth() {
  await apify('/users/me')
  return { apify: 'connected', cronConfigured: Boolean(process.env.CRON_SECRET) }
}

export async function enqueueInstagramStatistics(profileId?: string) {
  const db = database()
  const query = db.from('profiles').select('*').not('ig_username', 'is', null)
  const { data, error } = await query
  if (error) throw new Error('Could not read linked Instagram accounts')
  const target = profileId ? instagramUsername(data?.find(profile => profile.id === profileId)?.ig_username) : null
  const groups = new Map<string, string[]>()
  for (const profile of data ?? []) {
    const username = instagramUsername(profile.ig_username)
    if (!username || (profileId && username !== target) || profile.is_active === false || !canUseDashboard(profile)) continue
    groups.set(username, [...(groups.get(username) ?? []), profile.id])
  }
  const roster = await db.from('leaderboard_creators').select('id,name,ig_username,is_active,excluded').eq('is_active', true)
  if (roster.error) throw new Error('Could not read Skool leaderboard creators')
  for (const creator of linkedSkoolCreators(roster.data as SkoolLeaderboardCreator[])) {
    const username = creator.ig_username!
    if (profileId && username !== target) continue
    if (!groups.has(username)) groups.set(username, [])
  }
  const date = new Date().toISOString().slice(0, 10)
  const rows = [...groups].map(([username, profile_ids]) => ({ sync_date: date, username, profile_ids }))
  if (!rows.length) return 0
  const result = await db.from('instagram_sync_jobs').upsert(rows, {
    onConflict: 'sync_date,username', ignoreDuplicates: true,
  }).select('id')
  if (result.error) throw new Error('Could not save Instagram sync jobs')
  // A newly linked Dashboard profile can share a job originally created for
  // the Skool roster. Attach it without starting another paid account scan.
  if (profileId && target) {
    const current = await db.from('instagram_sync_jobs').select('id,profile_ids')
      .eq('sync_date', date).eq('username', target).maybeSingle()
    if (current.error) throw new Error('Could not read the daily Instagram job')
    const ids = [...new Set([...(current.data?.profile_ids ?? []), ...(groups.get(target) ?? [])])]
    if (current.data && ids.length !== current.data.profile_ids.length) {
      const updated = await db.from('instagram_sync_jobs').update({ profile_ids: ids }).eq('id', current.data.id)
      if (updated.error) throw new Error('Could not attach the linked Instagram profile')
    }
  }
  // Upgrade today's completed reel-only jobs once, retaining their follower read.
  const catchup = await db.from('instagram_sync_jobs').update({ status: 'queued', reels_done: false,
    reels_attempts: 0, reels_run_id: null, completed_at: null, next_attempt_at: new Date().toISOString(), last_error: null })
    .eq('sync_date', date).eq('status', 'succeeded').eq('posts_done', false).in('username', [...groups.keys()]).select('id')
  if (catchup.error) throw new Error('Could not queue Instagram post history')
  return (result.data?.length ?? 0) + (catchup.data?.length ?? 0)
}

async function saveJob(db: SupabaseClient, job: Job, patch: Record<string, unknown>) {
  const result = await db.from('instagram_sync_jobs').update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', job.id).eq('lease_token', job.lease_token).select('id').single()
  if (result.error || !result.data) throw new Error('Instagram sync job lease was lost')
  Object.assign(job, patch)
}

async function download(dataset: string): Promise<Record<string, unknown>[]> {
  const items = await apify(`/datasets/${encodeURIComponent(dataset)}/items?clean=true&limit=1001`)
  if (!Array.isArray(items)) throw new Error('Apify returned an invalid dataset')
  return items
}

async function eligibleProfiles(db: SupabaseClient, job: Job) {
  if (!job.profile_ids.length) return []
  const result = await db.from('profiles').select('*').in('id', job.profile_ids)
  if (result.error) throw new Error('Could not verify linked Instagram accounts')
  return (result.data ?? []).filter(profile => profile.is_active !== false
    && canUseDashboard(profile) && instagramUsername(profile.ig_username) === job.username)
}

async function eligibleCreators(db: SupabaseClient, job: Job) {
  const result = await db.from('leaderboard_creators').select('id,name,ig_username,is_active,excluded')
    .eq('ig_username', job.username).eq('is_active', true).eq('excluded', false)
  if (result.error) throw new Error('Could not verify Skool leaderboard membership')
  return linkedSkoolCreators(result.data as SkoolLeaderboardCreator[])
}

async function storeProfile(db: SupabaseClient, job: Job, run: Run, items: Record<string, unknown>[]) {
  const count = profileFollowers(items, job.username)
  const date = new Date(run.finishedAt ?? Date.now()).toISOString().slice(0, 10)
  const profiles = await eligibleProfiles(db, job)
  const creators = await eligibleCreators(db, job)
  if (creators.length) {
    const result = await db.from('leaderboard_creator_snapshots').upsert(creators.map(creator => ({
      creator_id: creator.id, date, count,
    })), { onConflict: 'creator_id,date' })
    if (result.error) throw new Error('Could not save Skool creator follower snapshots')
  }
  if (!profiles.length) return
  const snapshots = await db.from('follower_snapshots').upsert(profiles.map(profile => ({
    profile_id: profile.id, date, count,
  })), { onConflict: 'profile_id,date' })
  if (snapshots.error) throw new Error('Could not save follower snapshots')
  const update = await db.from('profiles').update({ followers_count: count }).in('id', profiles.map(profile => profile.id))
  if (update.error) throw new Error('Could not update follower counts')
}

async function storeReels(db: SupabaseClient, job: Job, items: Record<string, unknown>[]) {
  const reels = statisticsReels(items, job.username, statisticsWindow(job.sync_date), new Date().toISOString())
  const profiles = await eligibleProfiles(db, job)
  const creators = await eligibleCreators(db, job)
  for (const creator of creators) {
    if (!reels.length) continue
    const rows = reels.map(reel => ({ creator_id: creator.id, reel_id: reel.reel_id, date: reel.date, views: reel.views ?? null }))
    // Missing readings cannot erase a previously measured view count.
    const known = rows.filter(row => row.views !== null)
    const unknown = rows.filter(row => row.views === null)
    for (const [values, ignoreDuplicates] of [[known, false], [unknown, true]] as const) {
      if (!values.length) continue
      const result = await db.from('leaderboard_creator_reels').upsert(values, { onConflict: 'creator_id,reel_id', ignoreDuplicates })
      if (result.error) throw new Error('Could not save Skool creator reel statistics')
    }
  }
  for (const profile of profiles) {
    if (!reels.length) continue
    // Insert conflicts cannot overwrite analysis, stored thumbnails or private metrics.
    const result = await db.from('client_reels').upsert(reels.map(reel => ({
      ...reel, profile_id: profile.id, scraped_week: job.sync_date,
      views: reel.views ?? null, likes: reel.likes ?? null, comments: reel.comments ?? null,
      shares: reel.shares ?? null, saves: reel.saves ?? null,
    })), { onConflict: 'profile_id,reel_id', ignoreDuplicates: true })
    if (result.error) throw new Error('Could not save Instagram reels')
    for (let offset = 0; offset < reels.length; offset += 15) {
      await Promise.all(reels.slice(offset, offset + 15).map(async reel => {
        const metrics = reelStatisticsUpdate(reel)
        if (!Object.keys(metrics).length) return
        const update = await db.from('client_reels').update(metrics).eq('profile_id', profile.id).eq('reel_id', reel.reel_id)
        if (update.error) throw new Error('Could not update reel statistics')
      }))
    }
  }
  return reels.length
}

async function storePosts(db: SupabaseClient, job: Job, items: Record<string, unknown>[]) {
  const posts = statisticsPosts(items, job.username, statisticsWindow(job.sync_date, 60), new Date().toISOString())
  const profiles = await eligibleProfiles(db, job)
  const creators = await eligibleCreators(db, job)
  for (const creator of creators) {
    if (!posts.length) continue
    const result = await db.from('leaderboard_creator_posts').upsert(posts.map(post => ({ ...post, creator_id: creator.id })), { onConflict: 'creator_id,post_id' })
    if (result.error) throw new Error('Could not save Skool creator post history')
  }
  for (const profile of profiles) {
    if (!posts.length) continue
    const result = await db.from('instagram_posts').upsert(posts.map(post => ({ ...post, profile_id: profile.id })), { onConflict: 'profile_id,post_id' })
    if (result.error) throw new Error('Could not save Instagram post history')
  }
}

async function refreshWindows(db: SupabaseClient, job: Job) {
  const previous = await db.from('instagram_sync_jobs').select('sync_date,statistics_plan')
    .eq('username', job.username).eq('posts_done', true).eq('post_history_complete', true)
    .eq('status', 'succeeded').eq('reels_done', true)
    .lt('sync_date', job.sync_date).order('sync_date', { ascending: false }).limit(1).maybeSingle()
  if (previous.error) throw new Error('Could not check stored Instagram post history')
  return { previousDate: previous.data?.sync_date, previousPlan: previous.data?.statistics_plan as StatisticsPlan | null,
    postsStart: statisticsPostRefreshStart(job.sync_date, previous.data?.sync_date),
    reelsStart: statisticsReelRefreshStart(job.sync_date, previous.data?.sync_date) }
}

async function knownMonthlyReels(db: SupabaseClient, job: Job): Promise<string[]> {
  const [profiles, creators] = await Promise.all([eligibleProfiles(db, job), eligibleCreators(db, job)])
  const ids = new Set<string>()
  for (const [table, column, targets] of [
    ['client_reels', 'profile_id', profiles.map(profile => profile.id)],
    ['leaderboard_creator_reels', 'creator_id', creators.map(creator => creator.id)],
  ] as const) {
    if (!targets.length) continue
    const result = await db.from(table).select('reel_id').in(column, targets)
      .gte('date', statisticsWindow(job.sync_date).slice(0, 10)).limit(1001)
    if (result.error || result.data.length >= 1000) throw new Error('Could not verify complete stored monthly Reel coverage')
    for (const reel of result.data) ids.add(reel.reel_id)
  }
  return [...ids]
}

async function useOfficialFallback(db: SupabaseClient, job: Job) {
  await saveJob(db, job, { reels_run_id: null, reels_done: false, reels_attempts: 0,
    statistics_plan: { mode: 'fallback', metrics_done: true, gap_reel_ids: [], posts_start: job.statistics_plan?.posts_start ?? statisticsWindow(job.sync_date, 60) } })
}

async function component(db: SupabaseClient, job: Job, kind: Kind) {
  // Two durable content phases share the same run/attempt slot. Their flags
  // identify which Actor is running, including after a worker restart.
  const metricsPhase = kind === 'reels' && job.reels_done && job.statistics_plan?.mode === 'hybrid' && !job.statistics_plan.metrics_done
  const feedPhase = kind === 'reels' && job.reels_done && !metricsPhase
  const gaps = job.statistics_plan?.gap_reel_ids ?? []
  const runKey = `${kind}_run_id` as const
  const done = kind === 'profile' ? job.profile_done : metricsPhase ? false : feedPhase ? job.posts_done && !gaps.length : job.reels_done
  const attemptsKey = `${kind}_attempts` as const
  if (done || (!job[runKey] && job[attemptsKey] >= MAX_ATTEMPTS)) return
  // The daily profile read proves the cheaper Actor's minimum volume and can
  // supply the feed history for free. Do not launch duplicate content phases.
  if (kind === 'reels' && !job.profile_done && job.profile_attempts < MAX_ATTEMPTS) return
  if (!job[runKey]) {
    await saveJob(db, job, { [attemptsKey]: job[attemptsKey] + 1 })
    const actor = kind === 'profile' ? 'apify~instagram-profile-scraper' : metricsPhase ? 'apidojo~instagram-scraper'
      : feedPhase ? 'apify~instagram-post-scraper' : 'apify~instagram-reel-scraper'
    const { postsStart, reelsStart } = kind === 'reels' ? await refreshWindows(db, job)
      : { postsStart: statisticsWindow(job.sync_date, 60), reelsStart: statisticsWindow(job.sync_date, 60) }
    const input = kind === 'profile' ? { usernames: [job.username], includeAboutSection: false } : metricsPhase ? {
      startUrls: [`https://www.instagram.com/${job.username}/reels`], maxItems: 1000,
      until: statisticsWindow(job.sync_date).slice(0, 10),
    } : feedPhase ? {
      username: [...(!job.posts_done ? [job.username] : []), ...gaps.map(id => `https://www.instagram.com/reel/${id}/`)],
      resultsLimit: 1000, onlyPostsNewerThan: job.statistics_plan?.posts_start ?? postsStart,
      // Posting counts do not require the extra paid video/details package.
      skipPinnedPosts: false, dataDetailLevel: gaps.length ? 'detailedData' : 'basicData',
    } : {
      username: [job.username], resultsLimit: 1000,
      onlyPostsNewerThan: job.statistics_plan?.mode === 'hybrid' ? job.statistics_plan.posts_start : reelsStart,
      skipPinnedPosts: false, skipTrialReels: false,
      includeSharesCount: false, includeTranscript: false, includeDownloadedVideo: false,
    }
    // Two posting windows take longer on busy accounts. Keep the provider run
    // bounded while allowing the durable worker to collect the full history.
    const runTimeout = kind === 'profile' ? 300 : 900
    const response = await apify(`/acts/${actor}/runs?timeout=${runTimeout}`, input)
    if (!response.data?.id) throw new Error('Apify did not return a run ID')
    // Persist before yielding: future invocations resume this same paid run.
    await saveJob(db, job, { [runKey]: response.data.id })
    return
  }
  const response = await apify(`/actor-runs/${encodeURIComponent(job[runKey]!)}`)
  const run = response.data as Run
  if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(run.status)) {
    if (metricsPhase || (feedPhase && gaps.length)) { await useOfficialFallback(db, job); return }
    await saveJob(db, job, { [runKey]: null })
    throw new Error(`Apify ${kind} run ended with ${run.status}`)
  }
  if (run.status !== 'SUCCEEDED') return
  let items = await download(run.defaultDatasetId)
  try {
    if (kind === 'reels' && items.length >= 1000) {
      await saveJob(db, job, { [attemptsKey]: MAX_ATTEMPTS })
      throw new Error('Instagram post limit reached; complete monthly posting counts are unavailable')
    }
    if (metricsPhase) items = normaliseCheapStatistics(items, job.username)
    if (kind === 'profile') profileFollowers(items, job.username)
    else {
      statisticsPosts(items, job.username, statisticsWindow(job.sync_date, 60), new Date().toISOString())
      statisticsReels(items, job.username, statisticsWindow(job.sync_date), new Date().toISOString())
      if (feedPhase && gaps.length) {
        const measured = statisticsReels(items.filter(item => statistic(item, ['videoPlayCount']) !== undefined), job.username, statisticsWindow(job.sync_date), new Date().toISOString())
          .filter(reel => reel.views !== undefined).map(reel => reel.reel_id)
        if (gaps.some(id => !measured.includes(id))) throw new Error('Missing Reel statistics require the official monthly fallback')
      }
    }
  } catch (error) {
    if (metricsPhase || (feedPhase && gaps.length)) { await useOfficialFallback(db, job); return }
    // Instagram validation failures need a fresh Actor run; DB errors do not.
    await saveJob(db, job, { [runKey]: null,
      ...(terminalInstagramData(items) ? { [attemptsKey]: MAX_ATTEMPTS } : {}) })
    throw error
  }
  if (kind === 'profile') {
    await storeProfile(db, job, run, items)
    const windows = await refreshWindows(db, job)
    if (!job.reels_done && !job.reels_run_id && !job.statistics_plan
      && windows.previousPlan?.mode !== 'fallback'
      && canUseHybridStatistics(items, job.username, job.sync_date, windows.previousDate)) {
      await saveJob(db, job, { statistics_plan: { mode: 'hybrid', metrics_done: false, gap_reel_ids: [], posts_start: windows.postsStart } })
    }
    await saveJob(db, job, { profile_done: true })
    if (!job.posts_done && (!job.reels_done || !job.reels_run_id)) {
      const posts = profilePostCache(items, job.username, windows.postsStart, new Date().toISOString())
      if (posts) {
        await storePosts(db, job, posts)
        await saveJob(db, job, { posts_done: true, post_history_complete: true })
      }
    }
  } else if (metricsPhase) {
    const known = await knownMonthlyReels(db, job)
    const monthly = statisticsReels(items, job.username, statisticsWindow(job.sync_date), new Date().toISOString())
    const fresh = [...monthly.map(reel => ({ shortCode: reel.reel_id })), ...(job.statistics_plan?.fresh_reel_ids ?? []).map(shortCode => ({ shortCode }))]
    const gap_reel_ids = statisticsGaps(known, fresh)
    await storePosts(db, job, items)
    await storeReels(db, job, items)
    await saveJob(db, job, { reels_run_id: null, reels_attempts: 0,
      reel_count: new Set([...known, ...monthly.map(reel => reel.reel_id)]).size,
      statistics_plan: { ...job.statistics_plan!, metrics_done: true, gap_reel_ids } })
  } else if (feedPhase) {
    await storePosts(db, job, items)
    if (gaps.length) await storeReels(db, job, items)
    await saveJob(db, job, { posts_done: true, post_history_complete: true,
      ...(job.statistics_plan ? { statistics_plan: { ...job.statistics_plan, gap_reel_ids: [] } } : {}) })
  } else {
    await storePosts(db, job, items)
    const reel_count = await storeReels(db, job, items)
    await saveJob(db, job, { reels_done: true, reel_count, reels_run_id: null, reels_attempts: 0,
      ...(job.statistics_plan?.mode === 'hybrid' ? { statistics_plan: { ...job.statistics_plan,
        fresh_reel_ids: statisticsReels(items, job.username, statisticsWindow(job.sync_date), new Date().toISOString()).filter(reel => reel.views !== undefined).map(reel => reel.reel_id) } } : {}) })
  }
}

async function processJob(db: SupabaseClient, job: Job) {
  const errors: string[] = []
  try {
    const [profiles, creators] = await Promise.all([eligibleProfiles(db, job), eligibleCreators(db, job)])
    if (!profiles.length && !creators.length) {
      await saveJob(db, job, { status: 'skipped', completed_at: new Date().toISOString(), lease_until: null })
      return
    }
    for (const kind of ['profile', 'reels'] as const) {
      try { await component(db, job, kind) }
      catch (error) { errors.push(error instanceof Error ? error.message : 'Instagram sync failed') }
    }
    const status = statisticsJobState({ ...job, metrics_done: job.statistics_plan?.metrics_done,
      gaps_done: !job.statistics_plan?.gap_reel_ids.length })
    const complete = status === 'succeeded'
    const failed = status === 'failed'
    await saveJob(db, job, {
      status,
      last_error: errors.length ? errors.join('; ').slice(0, 500) : complete ? null : job.last_error,
      next_attempt_at: new Date(Date.now() + statisticsRetryDelay(status, errors.length > 0)).toISOString(),
      lease_until: null, lease_token: null,
      ...(complete || failed ? { completed_at: new Date().toISOString() } : {}),
    })
  } catch (error) {
    // A lost DB connection leaves run IDs intact, ready to resume after the lease.
    console.error('[instagram-statistics] Job persistence failed', job.id,
      error instanceof Error ? error.message : 'Unknown error')
  }
}

export async function processInstagramStatistics() {
  const db = database()
  const { data, error } = await db.rpc('claim_instagram_sync_jobs', { worker_id: randomUUID(), batch_size: 4 })
  if (error) throw new Error('Could not claim Instagram sync jobs')
  const jobs = (data ?? []) as Job[]
  await Promise.all(jobs.map(job => processJob(db, job)))
  return { processed: jobs.length, ...await instagramStatisticsStatus() }
}

export async function instagramStatisticsStatus() {
  const date = new Date().toISOString().slice(0, 10)
  const result = await database().from('instagram_sync_jobs').select('status,profile_done,reels_done,posts_done').eq('sync_date', date)
  if (result.error) throw new Error('Could not read Instagram sync status')
  const counts: Record<string, number> = { queued: 0, running: 0, succeeded: 0, failed: 0, skipped: 0 }
  for (const job of result.data ?? []) counts[job.status]++
  return { date, jobs: counts, followersUpdated: (result.data ?? []).filter(job => job.profile_done).length,
    reelsUpdated: (result.data ?? []).filter(job => job.reels_done).length,
    postsUpdated: (result.data ?? []).filter(job => job.posts_done).length }
}
