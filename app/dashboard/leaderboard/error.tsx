'use client'

export default function LeaderboardError({ reset }: { reset: () => void }) {
  return <div className="dash-page" style={{ padding: 36 }}>
    <h1 style={{ fontSize: 26, letterSpacing: '-.04em', marginBottom: 12 }}>The leaderboard is taking a moment.</h1>
    <p style={{ color: 'var(--muted-foreground)', marginBottom: 20 }}>Your statistics are safe. Try loading the rankings again.</p>
    <button onClick={reset} style={{ padding: '10px 18px', borderRadius: 8, background: '#dfbf7a', color: '#17130b', border: 0, fontWeight: 700, cursor: 'pointer' }}>Try again</button>
  </div>
}
