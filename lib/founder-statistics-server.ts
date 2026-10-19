import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { FOUNDER_ACCOUNTS, founderProfileIds, type FounderStatistics } from './founder-statistics'

async function readPages<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = []
  for (let from = 0; ; from += 1000) {
    const result = await read(from, from + 999)
    if (result.error) throw new Error('Could not load combined founder statistics')
    rows.push(...(result.data ?? []))
    if (!result.data || result.data.length < 1000) return rows
  }
}

export async function loadFounderStatistics(db: SupabaseClient, profileId: string): Promise<FounderStatistics | null> {
  if (!FOUNDER_ACCOUNTS.some(account => account.id === profileId)) return null
  const profiles = await db.from('profiles').select('id,ig_username').in('id', FOUNDER_ACCOUNTS.map(account => account.id))
  if (profiles.error) throw new Error('Could not read linked founder accounts')
  const ids = founderProfileIds(profileId, profiles.data ?? [])
  if (ids.length !== FOUNDER_ACCOUNTS.length) throw new Error('A founder account link has changed')
  const measuredAt = new Date().toISOString()
  const today = measuredAt.slice(0, 10)
  const since = new Date(Date.parse(today) - 7 * 86_400_000).toISOString().slice(0, 10)
  const [reels, posts, jobs] = await Promise.all([
    readPages<FounderStatistics['reels'][number]>((from, to) => db.from('client_reels').select('reel_id,date,views').in('profile_id', ids).order('profile_id').order('reel_id').range(from, to)),
    readPages<FounderStatistics['posts'][number]>((from, to) => db.from('instagram_posts').select('post_id,posted_at').in('profile_id', ids).order('profile_id').order('post_id').range(from, to)),
    db.from('instagram_sync_jobs').select('username,reels_done,posts_done,post_history_complete')
      .in('username', FOUNDER_ACCOUNTS.map(account => account.username)).gte('sync_date', since).lte('sync_date', today),
  ])
  if (jobs.error) throw new Error('Could not load combined founder statistics')
  return { reels, posts, measuredAt,
    viewsReady: FOUNDER_ACCOUNTS.every(account => jobs.data?.some(job => job.username === account.username && job.reels_done)),
    postsReady: FOUNDER_ACCOUNTS.every(account => jobs.data?.some(job => job.username === account.username && job.posts_done && job.post_history_complete)) }
}
