import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { canUseDashboard } from '@/lib/dashboard-access'
import { instagramUsername } from '@/lib/instagram-statistics'

/** Reuse public readings for an exactly linked Skool identity, without copying private analysis. */
export async function restoreLinkedInstagramStatistics(db: SupabaseClient, profileId: string): Promise<boolean> {
  const profileResult = await db.from('profiles').select('id,ig_username,followers_count,role,is_active,billing_exempt,access_type,billing_provider,membership_tier,subscription_status,subscription_period_end,skool_access_review_due_at')
    .eq('id', profileId).single()
  const profile = profileResult.data
  const username = instagramUsername(profile?.ig_username)
  if (profileResult.error || !profile || !username || !canUseDashboard(profile)) return false
  const existing = await db.from('client_reels').select('id', { count: 'exact', head: true }).eq('profile_id', profileId)
  if (existing.error || (existing.count && profile.followers_count !== null)) return false
  const source = await db.from('leaderboard_creators').select('id').eq('profile_id', profileId)
    .eq('ig_username', username).eq('is_active', true).eq('excluded', false).maybeSingle()
  if (source.error || !source.data) return false
  const creatorId = source.data.id
  const [snapshots, reels, posts, sync] = await Promise.all([
    db.from('leaderboard_creator_snapshots').select('date,count').eq('creator_id', creatorId).order('date', { ascending: false }).limit(90),
    db.from('leaderboard_creator_reels').select('reel_id,date,views').eq('creator_id', creatorId).order('date', { ascending: false }).limit(1000),
    db.from('leaderboard_creator_posts').select('post_id,posted_at,content_type').eq('creator_id', creatorId).order('posted_at', { ascending: false }).limit(1000),
    db.from('instagram_sync_jobs').select('completed_at').eq('username', username).eq('status', 'succeeded').order('completed_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  if ([snapshots, reels, posts, sync].some(result => result.error)) throw new Error('Could not load cached Instagram statistics')
  // Use the original sync time: restoring a cache is not a fresh Instagram reading.
  const measuredAt = sync.data?.completed_at
  if (!measuredAt) return false
  let restored = false
  if (snapshots.data?.length) {
    const result = await db.from('follower_snapshots').upsert(snapshots.data.map(row => ({ ...row, profile_id: profileId })), { onConflict: 'profile_id,date', ignoreDuplicates: true })
    if (result.error) throw new Error('Could not restore follower history')
    restored = true
    if (profile.followers_count === null) {
      const updated = await db.from('profiles').update({ followers_count: snapshots.data[0].count }).eq('id', profileId).eq('ig_username', profile.ig_username).is('followers_count', null)
      if (updated.error) throw new Error('Could not restore follower count')
    }
  }
  if (!existing.count && reels.data?.length) {
    const result = await db.from('client_reels').upsert(reels.data.map(row => ({
      ...row, profile_id: profileId, permalink: `https://www.instagram.com/reel/${row.reel_id}/`, created_at: measuredAt,
      likes: null, comments: null, saves: null, shares: null,
    })), { onConflict: 'profile_id,reel_id', ignoreDuplicates: true })
    if (result.error) throw new Error('Could not restore saved reel statistics')
    restored = true
  }
  if (posts.data?.length) {
    const result = await db.from('instagram_posts').upsert(posts.data.map(row => ({ ...row, profile_id: profileId })), { onConflict: 'profile_id,post_id', ignoreDuplicates: true })
    if (result.error) throw new Error('Could not restore saved post history')
    restored = true
  }
  return restored
}
