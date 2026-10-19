import { instagramUsername } from './instagram-statistics'
import type { LeaderboardProfile } from './leaderboard'

export interface SkoolLeaderboardCreator {
  id: string
  name: string
  ig_username: string | null
  profile_id?: string | null
  is_active: boolean
  excluded: boolean
}

/** Membership evidence adds competitors, never authentication or access grants. */
export function linkedSkoolCreators(creators: SkoolLeaderboardCreator[]): LeaderboardProfile[] {
  return creators.filter(creator => creator.is_active && !creator.excluded && instagramUsername(creator.ig_username))
    .map(creator => ({ id: creator.id, name: creator.name, ig_username: instagramUsername(creator.ig_username) }))
}
