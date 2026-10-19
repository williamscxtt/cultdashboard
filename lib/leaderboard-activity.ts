import type { LeaderboardEntry } from './leaderboard'

const count = (value: number) => Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

/** A useful measured analysis also remains available while AI refreshes. */
export function activityInsight(entry: LeaderboardEntry, leaders: LeaderboardEntry[]) {
  const name = entry.name.split(/\s+/)[0] || entry.username
  if (entry.postCount === null) return {
    title: 'Posting history is incomplete',
    text: 'There is not enough verified posting history to compare this creator’s output yet.',
    takeaway: 'Check the sync status before using this account as a posting benchmark.',
  }
  const days = entry.activeDays
  const rhythm = days ? `${count(entry.postCount)} feed posts across ${days} days` : `${count(entry.postCount)} feed posts`
  const share = entry.topReelShare
  if (share !== null && share >= 0.5) return {
    title: 'One Reel is carrying the reach',
    text: `${name}’s strongest Reel accounts for ${Math.round(share * 100)}% of recorded Reel views. That is a clear post to study, but the rest of the feed has not matched its reach.`,
    takeaway: 'Compare that Reel with an ordinary post. What changed in the topic, opening and payoff? Test a follow-up with the same useful idea and a fresh example.',
  }
  const mean = entry.reelCount ? (entry.views ?? 0) / entry.reelCount : 0
  const others = leaders.filter(leader => leader.username !== entry.username && leader.reelCount > 0)
  const strongestOther = others.sort((a, b) => (b.views ?? 0) / b.reelCount - (a.views ?? 0) / a.reelCount)[0]
  const strongestOtherMean = strongestOther ? (strongestOther.views ?? 0) / strongestOther.reelCount : 0
  if (strongestOtherMean > 0 && mean > strongestOtherMean * 2) return {
    title: 'More reach from each Reel',
    text: `${name} averages ${count(mean)} recorded views per Reel, about ${(mean / strongestOtherMean).toFixed(1)} times ${strongestOther.name.split(/\s+/)[0]}’s average.${share !== null && share < 0.2 ? ` The largest Reel contributes just ${Math.round(share * 100)}%, so the views are spread across the feed.` : ''}`,
    takeaway: 'Study several of the strongest Reels together. Look for a repeated audience problem, opening or explanation, then test that structure with a topic your own audience cares about.',
  }
  if (entry.previousPostCount !== null && entry.postCount > entry.previousPostCount * 1.25) {
    const increase = entry.postCount - entry.previousPostCount
    return {
      title: 'A bigger output, sustained across the month',
      text: `${name} published ${rhythm}, up ${count(increase)} on the previous window.${share !== null && share < 0.2 ? ` No single Reel contributes more than ${Math.ceil(share * 100)}% of the recorded views, so the reach is spread across many posts.` : ''}`,
      takeaway: 'Set a weekly output target you can maintain. Review your strongest posts each week and make another version of the useful idea, so extra output produces learning as well as more posts.',
    }
  }
  if (days !== null && days >= 20) return {
    title: 'A publishing rhythm that holds up',
    text: `${name} published ${rhythm}.${share !== null && share < 0.2 ? ` The largest Reel brings only ${Math.round(share * 100)}% of recorded views, so the result comes from many posts rather than a single breakout.` : ''}${entry.postTypes.carousel ? ` The mix includes ${entry.postTypes.carousel} carousels as well as Reels.` : ''}`,
    takeaway: 'Build a short repeatable series around a problem your audience has. Prepare several examples together, then use the response to each post to decide which angle deserves a follow-up.',
  }
  return {
    title: 'Use the published posts as your next test',
    text: `${name} has published ${rhythm}, with ${count(entry.views ?? 0)} recorded views across ${entry.reelCount} Reels. These posts give you examples to compare before choosing what to make next.`,
    takeaway: 'Put the strongest Reel beside a typical post. Write down the difference in topic, opening and payoff, then change one of those elements in your next post and compare the response.',
  }
}
