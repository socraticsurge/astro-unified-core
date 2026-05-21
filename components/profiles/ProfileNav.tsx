'use client'

import { ProfileChip } from './ProfileChip'

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
    <div className="flex items-stretch h-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
  )
}
