'use client'

import { ProfileChip } from './ProfileChip'
import { formatName } from '@/lib/display'

export interface NavProfile {
  id: string
  name: string
  relationship: string | null
  hasAlert?: boolean
}

interface ProfileNavProps {
  profiles: NavProfile[]
  activeProfileId: string | null
  onProfileChange: (id: string) => void
}

export function ProfileNav({ profiles, activeProfileId, onProfileChange }: ProfileNavProps) {
  return (
    <>
      {/* Mobile: native dropdown — more intuitive than a swipeable chip strip */}
      <div className="sm:hidden flex items-center h-full px-3 flex-1">
        <select
          value={activeProfileId ?? ""}
          onChange={e => onProfileChange(e.target.value)}
          className="w-full h-8 rounded-md text-sm bg-transparent text-[var(--color-ink-1)] border border-[var(--color-border)] px-2 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
        >
          {profiles.map(p => (
            <option key={p.id} value={p.id}>
              {formatName(p.name)}{p.relationship ? ` · ${p.relationship}` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop: horizontal chip strip */}
      <div className="hidden sm:flex items-stretch h-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {profiles.map((profile) => (
          <ProfileChip
            key={profile.id}
            id={profile.id}
            name={profile.name}
            relationship={profile.relationship ?? ''}
            isActive={profile.id === activeProfileId}
            hasAlert={profile.hasAlert}
            onClick={onProfileChange}
          />
        ))}
      </div>
    </>
  )
}
