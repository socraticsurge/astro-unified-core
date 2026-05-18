'use client'

import { cn } from '@/lib/utils'
import Link from 'next/link'
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
  onAskOpen: () => void
}

export function ProfileNav({
  profiles,
  activeProfileId,
  onProfileChange,
  onAskOpen,
}: ProfileNavProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Scrollable chip row */}
      <div className="overflow-x-auto flex-1 min-w-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2 pb-2">
          {profiles.map((profile) => (
            <ProfileChip
              key={profile.id}
              id={profile.id}
              name={profile.name}
              relationship={profile.relationship || ''}
              isActive={profile.id === activeProfileId}
              hasAlert={profile.hasAlert}
              onClick={onProfileChange}
            />
          ))}

          {/* Add profile link */}
          <Link
            href="/profiles/new"
            aria-label="Add profile"
            className={cn(
              'flex items-center justify-center rounded-full border border-dashed px-3 py-2 h-[38px] transition-colors',
              'border-[var(--color-border)]',
              'hover:border-[var(--color-nav-chip-active-border)]'
            )}
          >
            <span className="text-sm font-semibold">+</span>
          </Link>
        </div>
      </div>

      {/* Ask button */}
      <button
        type="button"
        aria-label="Ask an expert"
        onClick={onAskOpen}
        className={cn(
          'flex items-center gap-2 rounded-lg border px-4 py-2 font-medium transition-opacity',
          'bg-[var(--color-nav-ask-bg)]',
          'border-[var(--color-nav-ask-border)]',
          'text-[var(--color-nav-ask-text)]',
          'hover:opacity-80'
        )}
      >
        <span aria-hidden="true" className="text-sm">✦</span>
        <span className="hidden sm:inline">Ask an expert</span>
        <span className="sm:hidden">Ask</span>
      </button>
    </div>
  )
}
