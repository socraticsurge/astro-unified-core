"use client"
import Link from 'next/link'
import type { Profile } from '@/lib/db'

interface CompareTabProps {
  activeProfile: Profile
  allProfiles: Profile[]
}

export function CompareTab({ activeProfile, allProfiles }: CompareTabProps) {
  const others = allProfiles.filter(p => p.id !== activeProfile.id)

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Compare {activeProfile.name?.split(' ')[0] ?? activeProfile.name}&apos;s chart with another person.
      </p>

      {others.length === 0 ? (
        <div className="p-4 rounded-lg border border-dashed border-[var(--color-border)] text-center">
          <p className="text-xs text-muted-foreground mb-2">No other profiles yet.</p>
          <Link href="/profiles/new" className="text-xs text-[var(--color-today-ask-cta-text)] hover:underline">
            Add a profile to compare →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {others.map(p => (
            <Link
              key={p.id}
              href={`/compatibility/${activeProfile.id}?with=${p.id}`}
              className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] hover:border-[var(--color-nav-chip-active-border)] transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--color-ink-1)]">{p.name?.split(' ')[0] ?? p.name}</p>
                <p className="text-xs text-muted-foreground">{p.relationship ?? 'Other'}</p>
              </div>
              <span className="text-xs text-muted-foreground">View compatibility →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
