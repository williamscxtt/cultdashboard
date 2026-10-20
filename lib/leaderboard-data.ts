import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { canUseDashboard } from '@/lib/dashboard-access'
import { linkedSkoolCreators, type SkoolLeaderboardCreator } from '@/lib/leaderboard-roster'
import { buildLeaderboard, visibleLeaderboard, type LeaderboardProfile, type LeaderboardSnapshot, type LeaderboardReel, type LeaderboardSync, type LeaderboardPost } from '@/lib/leaderboard'

export function leaderboardDatabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function readPages<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await read(from, from + 999)
    if (error) throw new Error('Leaderboard statistics are temporarily unavailable')
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) return rows
  }
}

export async function loadLeaderboard(viewerId = '', now = new Date()) {
  const db = leaderboardDatabase()
  const [profiles, roster] = await Promise.all([
    readPages<LeaderboardProfile & Parameters<typeof canUseDashboard>[0]>((from, to) => db.from('profiles')
    .select('id,name,ig_username,role,is_active,billing_exempt,billing_provider,access_type,membership_tier,subscription_status,subscription_period_end,skool_access_review_due_at')
    .eq('is_active', true).not('ig_username', 'is', null).neq('ig_username', '').order('id').range(from, to)),
    readPages<SkoolLeaderboardCreator>((from, to) => db.from('leaderboard_creators')
    .select('id,name,ig_username,profile_id,is_active,excluded').eq('is_active', true).eq('excluded', false).order('id').range(from, to)),
  ])
  const eligible: LeaderboardProfile[] = profiles.filter(canUseDashboard)
  const creators = linkedSkoolCreators(roster)
  // Exact verified profile links retain historical metrics and the creator's chosen account.
  const knownIds = new Set(eligible.map(profile => profile.id))
  const linkedIds = roster.filter(creator => creator.profile_id && creator.ig_username).map(creator => creator.profile_id!)
    .filter(id => !knownIds.has(id))
  if (linkedIds.length) {
    const historical = await readPages<LeaderboardProfile>((from, to) => db.from('profiles').select('id,name,ig_username')
      .in('id', linkedIds).order('id').range(from, to))
    // A later connection change must not attach another Instagram account's statistics.
    eligible.push(...historical.filter(profile => roster.some(creator => creator.profile_id === profile.id
      && creator.ig_username === profile.ig_username?.trim().replace(/^@/, '').toLowerCase())))
  }
  const ids = eligible.map(profile => profile.id)
  const today = Date.parse(now.toISOString().slice(0, 10))
  const day = (offset: number) => new Date(today - offset * 86_400_000).toISOString().slice(0, 10)
  const creatorIds = creators.map(creator => creator.id)
  const [snapshots, reels, syncs, posts, skoolSnapshots, skoolReels, skoolPosts] = await Promise.all([
    ids.length ? readPages<LeaderboardSnapshot>((from, to) => db.from('follower_snapshots').select('profile_id,date,count').in('profile_id', ids)
      .gte('date', day(30)).lte('date', day(0)).order('profile_id').order('date').order('id').range(from, to)) : Promise.resolve<LeaderboardSnapshot[]>([]),
    ids.length ? readPages<LeaderboardReel>((from, to) => db.from('client_reels').select('profile_id,reel_id,date,views').in('profile_id', ids)
      .gte('date', day(29)).lte('date', now.toISOString()).order('profile_id').order('id').range(from, to)) : Promise.resolve<LeaderboardReel[]>([]),
    readPages<LeaderboardSync>((from, to) => db.from('instagram_sync_jobs')
      .select('username,sync_date,status,reels_done,reel_count,last_error,posts_done,post_history_complete')
      .gte('sync_date', day(29)).lte('sync_date', day(0)).order('sync_date', { ascending: false }).order('username').range(from, to)),
    ids.length ? readPages<LeaderboardPost>((from, to) => db.from('instagram_posts').select('profile_id,post_id,posted_at,content_type').in('profile_id', ids)
      .gte('posted_at', day(59)).lte('posted_at', now.toISOString()).order('profile_id').order('post_id').range(from, to)) : Promise.resolve<LeaderboardPost[]>([]),
    creatorIds.length ? readPages<LeaderboardSnapshot>((from, to) => db.from('leaderboard_creator_snapshots').select('profile_id:creator_id,date,count')
      .in('creator_id', creatorIds).gte('date', day(30)).lte('date', day(0)).order('creator_id').order('date').range(from, to)) : Promise.resolve<LeaderboardSnapshot[]>([]),
    creatorIds.length ? readPages<LeaderboardReel>((from, to) => db.from('leaderboard_creator_reels').select('profile_id:creator_id,reel_id,date,views')
      .in('creator_id', creatorIds).gte('date', day(29)).lte('date', day(0)).order('creator_id').order('reel_id').range(from, to)) : Promise.resolve<LeaderboardReel[]>([]),
    creatorIds.length ? readPages<LeaderboardPost>((from, to) => db.from('leaderboard_creator_posts').select('profile_id:creator_id,post_id,posted_at,content_type')
      .in('creator_id', creatorIds).gte('posted_at', day(59)).lte('posted_at', now.toISOString()).order('creator_id').order('post_id').range(from, to)) : Promise.resolve<LeaderboardPost[]>([]),
  ])
  snapshots.push(...skoolSnapshots)
  reels.push(...skoolReels)
  posts.push(...skoolPosts)
  return visibleLeaderboard(buildLeaderboard([...eligible, ...creators], snapshots, reels, viewerId, now, syncs, posts))
}
