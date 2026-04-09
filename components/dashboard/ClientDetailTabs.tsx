'use client'

import { useState } from 'react'
import type { Profile } from '@/lib/types'
import OnboardingHub from './OnboardingHub'
import { BarChart2, ClipboardList } from 'lucide-react'

interface Props {
  profile: Profile
  overviewContent: React.ReactNode
}

const TABS = [
  { id: 'overview',  label: 'Overview',  icon: BarChart2 },
  { id: 'profile',   label: 'Profile',   icon: ClipboardList },
]

export default function ClientDetailTabs({ profile, overviewContent }: Props) {
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
    </div>
  )
}
