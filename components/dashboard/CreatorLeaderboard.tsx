'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, Crown, ArrowUpRight, TrendingUp, Eye, Search, RefreshCw, ArrowRight, Radio, Users, Link2, FileText, Sparkles } from 'lucide-react'
import type { LeaderboardData, LeaderboardEntry } from '@/lib/leaderboard'
import type { LeaderboardInsights } from '@/lib/leaderboard-insight-model'
import { activityInsight } from '@/lib/leaderboard-activity'
import styles from './CreatorLeaderboard.module.css'

// Compact symbols/month abbreviations differ across ICU versions. Keep SSR
// and browser text identical so the leaderboard hydrates without replacing it.
const number = (value: number) => {
  const unit = value >= 1_000_000_000 ? [1_000_000_000,'B'] as const : value >= 1_000_000 ? [1_000_000,'M'] as const : value >= 10_000 ? [1000,'K'] as const : [1,''] as const
  const [whole, fraction] = (value / unit[0]).toFixed(1).replace(/\.0$/, '').split('.')
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction ? `.${fraction}` : '') + unit[1]
}
const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${number(Math.abs(value))}`
const date = (value: string) => { const day = new Date(value); return `${day.getUTCDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][day.getUTCMonth()]}` }
const initials = (name: string) => name.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()
const trackingPeriod = (entry: LeaderboardEntry) => entry.followerGrowth !== null ? 'Full month of follower history' : `${entry.trackedDays} / 30 days of follower history`
const statusLabels = { ranked: 'Ranked', building_history: 'Second follower reading due', needs_sync: 'Awaiting first sync', waiting_for_reels: 'Reel stats pending', syncing: 'Sync in progress', sync_failed: 'Sync needs attention' }
const pendingLabel = (entry: LeaderboardEntry) => entry.syncIssue === 'account_unavailable' ? 'Instagram account unavailable'
  : entry.syncIssue === 'account_restricted' ? 'Instagram profile restricted' : statusLabels[entry.status]
const postDetail = (entry: LeaderboardEntry) => entry.syncIssue === 'account_unavailable' ? 'Check the linked Instagram handle'
  : entry.syncIssue === 'account_restricted' ? 'Instagram profile restricted'
  : entry.syncIssue === 'retry_needed' ? 'Retry due on the next daily sync' : 'Feed statistics syncing'
const missingPosts = (entry: LeaderboardEntry) => entry.syncIssue ? 'Unavailable' : 'Pending'

function FollowerMetric({ entry, podium = false }: { entry: LeaderboardEntry; podium?: boolean }) {
  const monthly = entry.followerGrowth !== null
  const detail = monthly ? 'Verified 30-day net change' : entry.observedFollowerGrowth !== null && entry.firstTracked && entry.lastSynced
    ? `Observed ${signed(entry.observedFollowerGrowth)} · ${date(entry.firstTracked)}–${date(entry.lastSynced)}`
    : entry.firstTracked ? `Tracking started ${date(entry.firstTracked)}` : 'Follower stats unavailable'
  return <><strong className={!monthly ? styles.historyBuilding : entry.followerGrowth! < 0 ? styles.negative : styles.positive}>
    {monthly ? signed(entry.followerGrowth!) : podium ? 'Building' : 'History building'}
  </strong><small>{detail}</small></>
}

function LeaderInsights({ entries, insights }: { entries: LeaderboardEntry[]; insights: LeaderboardInsights | null }) {
  if (!entries.length) return null
  return <section className={styles.insights} aria-label="Insights from the leading creators">
    <div className={styles.insightHeading}><div><Sparkles size={17} /><h2>What the leaders are doing well</h2></div><span>{insights ? 'AI insights · updated daily' : 'Performance notes'}</span></div>
    <div className={styles.insightGrid}>{entries.map(entry => {
      const insight = insights?.items.find(item => item.username === entry.username) ?? activityInsight(entry, entries)
      const change = entry.postCount !== null && entry.previousPostCount !== null ? entry.postCount - entry.previousPostCount : null
      return <article key={entry.username}>
        <div className={styles.insightCreator}><span>0{entry.rank}</span><a href={`https://www.instagram.com/${entry.username}/`} target="_blank" rel="noopener noreferrer">{entry.name}<ArrowUpRight size={12} /></a></div>
        <div className={styles.insightStats}><strong>{entry.postCount === null ? `Posts ${missingPosts(entry).toLowerCase()}` : `${entry.postCount} posts`}</strong><span>{entry.activeDays !== null ? `across ${entry.activeDays} days` : postDetail(entry)}</span></div>
        {change !== null && <div className={styles.insightComparison}>{signed(change)} posts vs the previous 30 days</div>}
        <div className={styles.insightResults}><span>{number(entry.views!)} Reel views</span><span>{entry.followerGrowth !== null ? `${signed(entry.followerGrowth)} net followers` : 'Follower history building'}</span></div>
        {entry.reelCount > 0 && <div className={styles.insightEvidence}>{number(Math.round((entry.views ?? 0) / entry.reelCount))} views per Reel{entry.topReelShare !== null && ` · Top Reel: ${(entry.topReelShare * 100).toFixed(1)}% of views`}</div>}
        <h3>{insight.title}</h3>
        <p>{insight.text}</p>
        <div className={styles.insightTakeaway}><span>Try this</span><p>{insight.takeaway}</p></div>
      </article>
    })}</div>
    <div className={styles.insightFoot}>Posting comparisons use two 30-day windows. Patterns suggest what to test; they do not prove what caused the results.</div>
  </section>
}

function Creator({ entry, large = false }: { entry: LeaderboardEntry; large?: boolean }) {
  return <div className={`${styles.creator} ${large ? styles.creatorLarge : ''}`}>
    <div className={styles.avatar} aria-hidden="true">{initials(entry.name)}</div>
    <div className={styles.identity}>
      <div className={styles.name}>{entry.name}{entry.isYou && <span className={styles.you}>You</span>}</div>
      <a href={`https://www.instagram.com/${entry.username}/`} target="_blank" rel="noopener noreferrer" className={styles.handle}>@{entry.username}<ArrowUpRight size={12} /></a>
    </div>
  </div>
}

function PodiumCard({ entry }: { entry: LeaderboardEntry }) {
  const champion = entry.rank === 1
  return <article className={`${styles.podiumCard} ${champion ? styles.champion : ''}`} data-place={entry.rank} aria-label={`Rank ${entry.rank}: ${entry.name}`}>
    {champion && <span className={styles.watermark} aria-hidden="true">01</span>}
    <div className={styles.placeLabel}>{champion ? <Crown size={17} /> : <Trophy size={14} />} {champion ? 'Leading the Cult' : entry.rank === 2 ? 'Second place' : 'Third place'}</div>
    <Creator entry={entry} large />
    <div className={styles.podiumScore}><strong title={entry.score!.toLocaleString('en-GB', { maximumFractionDigits: 1 })}>{number(entry.score!)}</strong><span>Cult points</span></div>
    <div className={styles.podiumMetrics}>
      <div><span><FileText size={13} /> Posts</span><strong>{entry.postCount === null ? missingPosts(entry) : number(entry.postCount)}</strong><small>{entry.postCount === null ? postDetail(entry) : 'Reels, photos & carousels'}</small></div>
      <div><span><TrendingUp size={13} /> 30-day followers</span><FollowerMetric entry={entry} podium /></div>
      <div><span><Eye size={13} /> Reel views</span><strong>{number(entry.views!)}</strong><small>{entry.reelCount} {entry.reelCount === 1 ? 'reel' : 'reels'}</small></div>
    </div>
    <div className={styles.podiumFoot}>{trackingPeriod(entry)} <span>Latest sync {date(entry.lastSynced!)}</span></div>
  </article>
}

export default function CreatorLeaderboard({ data, insights = null }: { data: LeaderboardData; insights?: LeaderboardInsights | null }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [refreshing, startRefresh] = useTransition()
  const [onlyYou, setOnlyYou] = useState(false)
  const podium = data.entries.filter(entry => entry.rank !== null).slice(0, 3)
  const yourEntry = data.entries.find(entry => entry.isYou)
  const visible = data.entries.filter(entry => (!onlyYou || entry.isYou) && `${entry.name} ${entry.username}`.toLowerCase().includes(search.trim().toLowerCase()))
  const growthPending = data.rankedCount - data.growthReadyCount
  const leadingScore = podium[0]?.score || 1
  const pending = data.entries.filter(entry => entry.rank === null)
  const failed = data.entries.filter(entry => entry.syncIssue !== null).length
  const syncing = pending.filter(entry => entry.status === 'syncing').length
  const history = pending.filter(entry => entry.status === 'building_history').length

  return <div className={`${styles.page} dash-page`}>
    <header className={styles.header}>
      <div>
        <div className={styles.eyebrow}><span /> THE CULT · CREATOR PERFORMANCE</div>
        <h1>Creator leaderboard<span>.</span></h1>
        <p>Track what you publish and how it performs.</p>
      </div>
      <div className={styles.headerActions}>
        <span className={styles.period}><Radio size={12} /> 30-day activity <span>{date(data.windowStart)} – {date(data.windowEnd)}</span></span>
        <button className={styles.refresh} onClick={() => startRefresh(() => router.refresh())} disabled={refreshing} aria-label="Refresh leaderboard"><RefreshCw size={15} className={refreshing ? styles.spinning : ''} /></button>
      </div>
    </header>

    <div className={styles.summary}>
      <div><Users size={17} /><span><strong>{data.rankedCount}<small> / {data.connectedCount}</small></strong><label>Creators ranked</label></span></div>
      <div><FileText size={17} /><span><strong>{data.postsReadyCount ? number(data.totalPosts) : 'Pending'}</strong><label>Posts published · {data.postsReadyCount} accounts synced</label></span></div>
      <div><Eye size={17} /><span><strong>{number(data.totalViews)}</strong><label>Recorded Reel views</label></span></div>
    </div>

    {(failed > 0 || history > 0 || syncing > 0) && <div className={styles.syncNotice}>
      <RefreshCw size={15} />
      <span>{syncing > 0 && `${syncing} ${syncing === 1 ? 'account is' : 'accounts are'} syncing. `}{history > 0 && `${history} ${history === 1 ? 'account has' : 'accounts have'} synced and ${history === 1 ? 'needs' : 'need'} a second follower reading to measure growth. `}{failed > 0 && `${failed} ${failed === 1 ? 'account needs' : 'accounts need'} attention. Check the status beside each creator.`}</span>
    </div>}

    {growthPending > 0 && <div className={styles.historyNotice}><TrendingUp size={15} /><span>Monthly follower history is building for {growthPending} ranked creators. Posting and views count now; follower points start once a full 30-day change can be measured. Shorter changes are labelled “Observed”.</span></div>}

    {podium.length > 0 ? <section aria-label="Top creators" className={styles.podium}>
      {podium.map(entry => <PodiumCard key={entry.username} entry={entry} />)}
    </section> : <div className={styles.emptyPodium}><Trophy size={32} /><h2>The next leader could be you.</h2><p>The podium opens when connected accounts have recent statistics.</p><a href="/dashboard/settings">Check your Instagram connection <ArrowRight size={14} /></a></div>}

    <LeaderInsights entries={podium} insights={insights} />

    {yourEntry ? <div className={styles.yourPosition}>
      <div className={styles.positionBadge}>{yourEntry.rank ? `#${yourEntry.rank}` : <Link2 size={19} />}</div>
      <div><span>Your standing</span><strong>{yourEntry.rank ? `You're in the top ${Math.ceil((yourEntry.rank / data.rankedCount) * 100)}% of ranked creators` : pendingLabel(yourEntry)}</strong></div>
      <div className={styles.positionScore}>{yourEntry.score !== null ? <><strong>{number(yourEntry.score)}</strong><span>Cult points</span></> : <a href="/dashboard/settings">Check stats <ArrowUpRight size={13} /></a>}</div>
    </div> : !data.viewerExcluded && <div className={styles.connect}><Link2 size={17} /><span>Connect Instagram to join the leaderboard.</span><a href="/dashboard/settings">Connect account <ArrowRight size={14} /></a></div>}

    <section className={styles.rankings} aria-label="Creator rankings">
      <div className={styles.tableTop}><div><h2>The rankings</h2><span>250 points per post · 1 per 1K views · 1.5 per monthly follower</span></div><div className={styles.filters}>
        {yourEntry && <button className={`${styles.filterButton} ${onlyYou ? styles.filterActive : ''}`} aria-pressed={onlyYou} onClick={() => setOnlyYou(!onlyYou)}>{onlyYou ? 'Show everyone' : 'My position'}</button>}
        <label className={styles.search}><Search size={14} /><input aria-label="Search creators" placeholder="Find a creator" value={search} onChange={event => setSearch(event.target.value)} /></label>
      </div></div>
      <div className={styles.tableWrap}><table className={styles.table}>
        <thead><tr><th scope="col">Rank</th><th scope="col">Creator</th><th scope="col">Posts published</th><th scope="col">30-day net followers</th><th scope="col">Reel views</th><th scope="col">Cult points</th><th scope="col">Follower history</th></tr></thead>
        <tbody>{visible.map(entry => <tr key={entry.username} className={`${entry.isYou ? styles.yourRow : ''} ${entry.rank === 1 ? styles.firstRow : ''}`}>
          <td><span className={`${styles.rank} ${entry.rank !== null && entry.rank <= 3 ? styles.medal : ''}`}>{entry.rank === 1 ? <Crown size={17} aria-label="First place" /> : entry.rank ? String(entry.rank).padStart(2, '0') : '—'}</span></td>
          <td><Creator entry={entry} /></td>
          <td><strong className={styles.postCount}>{entry.postCount === null ? missingPosts(entry) : entry.postCount}</strong><small>{entry.postCount === null ? postDetail(entry) : entry.previousPostCount !== null ? `${signed(entry.postCount - entry.previousPostCount)} vs previous 30 days` : 'All Instagram feed posts'}</small></td>
          <td><FollowerMetric entry={entry} /></td>
          <td><strong>{entry.views === null ? '—' : number(entry.views)}</strong><small>{entry.reelCount ? `${entry.reelCount} ${entry.reelCount === 1 ? 'reel' : 'reels'}` : entry.views === 0 ? 'No reels posted in this window' : 'Reel stats unavailable'}</small></td>
          <td>{entry.score !== null ? <div className={styles.scoreCell} title={`${number(entry.postingPoints!)} posting points + ${number(entry.viewPoints!)} view points + ${entry.followerGrowth === null ? 'monthly follower bonus pending' : `${number(entry.growthPoints!)} follower points`}`}><strong>{number(entry.score)}<small> pts</small></strong><div className={styles.scoreTrack}><span style={{ width: `${Math.min(100,entry.score / leadingScore * 100)}%` }} /></div></div> : <span className={styles.pending}>{pendingLabel(entry)}</span>}</td>
          <td><span className={styles.tracking}>{entry.status === 'ranked' ? trackingPeriod(entry) : pendingLabel(entry)}</span><small>{entry.syncIssue === 'account_unavailable' ? 'Check the linked Instagram handle' : entry.syncIssue === 'account_restricted' ? 'Instagram blocks public statistics for this profile' : entry.syncIssue === 'retry_needed' ? 'Automatic retry on the next daily sync' : entry.lastSynced ? `Synced ${date(entry.lastSynced)}` : 'No recent sync'}</small></td>
        </tr>)}</tbody>
      </table></div>
      {visible.length === 0 && <div className={styles.noResults}>No creators match your search.</div>}
      <div className={styles.tableFoot}><span>{data.connectedCount} linked {data.connectedCount === 1 ? 'creator' : 'creators'} · {data.rankedCount} ranked{failed > 0 && ` · ${failed} need attention`}{syncing > 0 && ` · ${syncing} syncing`}{history > 0 && ` · ${history} awaiting a second reading`}</span><span>Instagram stats sync daily</span></div>
    </section>

    <details className={styles.method}>
      <summary>How the leaderboard works <span>Posting + reach + verified growth</span></summary>
      <div><p>Each feed post earns 250 points. Every 1,000 recorded Reel views earns one point. Each net follower gained over a verified 30-day period adds 1.5 points. These are fixed scoring units, so a large lead in views keeps its value. Follower losses add no bonus and do not deduct your posting or view points. Equal scores are ordered by Reel views, then posts published.</p>
        <p>Posts include Reels, carousels and photos. A carousel counts as one piece. Stories are not included. Posting comparisons use the current 30 calendar dates and the previous 30. Views are the latest recorded totals on Reels published in the current window, including views they received after posting.</p>
        <p>Monthly follower change requires counts dated 30 days apart, ending today. Until those readings exist, your posting and views can earn a rank; follower growth says “History building”. Any shorter net change is shown as “Observed” with its dates and earns no monthly bonus. We do not estimate or invent missing follower history. Only creators with available statistics, at least one published feed post and positive recorded Reel views appear in the rankings. Accounts continue syncing daily and can return when they meet those conditions. Insight comparisons use the latest completed statistics.</p>
      </div>
    </details>
  </div>
}
