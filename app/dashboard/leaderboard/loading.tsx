export default function LeaderboardLoading() {
  return <div className="dash-page" style={{ maxWidth: 1350, margin: '0 auto', padding: 36, width: '100%' }} aria-label="Loading creator leaderboard" aria-busy="true">
    <div className="skeleton-shimmer" style={{ width: 230, height: 36, borderRadius: 8, marginBottom: 20 }} />
    <div className="skeleton-shimmer" style={{ height: 82, borderRadius: 12, marginBottom: 24 }} />
    <div className="skeleton-shimmer" style={{ height: 330, borderRadius: 16, marginBottom: 24 }} />
    <div className="skeleton-shimmer" style={{ height: 350, borderRadius: 12 }} />
  </div>
}
