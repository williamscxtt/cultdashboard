'use client'

import { useState } from 'react'
import type { Profile } from '@/lib/types'
import OnboardingHub from './OnboardingHub'
import RoadmapPanel from './RoadmapPanel'
import { BarChart2, ClipboardList, Map } from 'lucide-react'

interface TranscriptEntry {
  id: string
  label: string
  content: string
  added_at: string
}

interface Props {
  profile: Profile
  overviewContent: React.ReactNode
  callTranscripts: TranscriptEntry[]
  roadmapGeneratedAt: string | null
}

const TABS = [
  { id: 'overview',  label: 'Overview',  icon: BarChart2 },
  { id: 'profile',   label: 'Profile',   icon: ClipboardList },
  { id: 'roadmap',   label: 'Roadmap',   icon: Map },
]

export default function ClientDetailTabs({ profile, overviewContent, callTranscripts, roadmapGeneratedAt }: Props) {
  const [active, setActive] = useState('overview')

  return (
    <div>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        gap: 2,
        background: 'var(--muted)',
        padding: 3,
        borderRadius: 10,
        width: 'fit-content',
        marginBottom: 20,
      }}>
        {TABS.map(tab => {
          const isActive = tab.id === active
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 14px', borderRadius: 7,
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 13, fontWeight: 600,
                transition: 'all 0.13s ease',
                background: isActive ? 'var(--card)' : 'transparent',
                color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)',
                boxShadow: isActive ? 'var(--shadow-xs)' : 'none',
                letterSpacing: '-0.15px',
              }}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {active === 'overview' && overviewContent}
      {active === 'profile' && (
        <OnboardingHub profile={profile} adminView />
      )}
      {active === 'roadmap' && (
        <RoadmapPanel
          profileId={profile.id}
          profileName={profile.name || 'Client'}
          roadmapGeneratedAt={roadmapGeneratedAt}
          callTranscripts={callTranscripts}
        />
      )}
    </div>
  )
}
