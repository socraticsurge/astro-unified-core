'use client'

import { cn } from '@/lib/utils'

export interface ProfileChipProps {
  id: string
  name: string
  relationship: string
  isActive: boolean
  hasAlert?: boolean
  onClick: (id: string) => void
}

export function ProfileChip({
  id,
  name,
  relationship,
  isActive,
  hasAlert,
  onClick,
}: ProfileChipProps) {
  const firstName = name.split(' ')[0]

  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      aria-label={`${firstName} — ${relationship}`}
      aria-pressed={isActive}
      className={cn(
        'relative flex flex-col items-start gap-0.5 rounded-full border px-3 py-2 transition-colors',
        isActive
          ? 'border-[var(--color-nav-chip-active-border)] bg-[var(--color-nav-chip-active-bg)] text-[var(--color-nav-chip-active-text)]'
          : 'border-[var(--color-border)] bg-transparent text-muted-foreground hover:border-[var(--color-nav-chip-active-border)]'
      )}
    >
      <span className="text-[11px] font-bold leading-tight whitespace-nowrap">
        {firstName}
      </span>
      <span className="text-[9px] leading-tight opacity-60 whitespace-nowrap">
        {relationship}
      </span>
      {hasAlert && (
        <div
          data-testid="alert-dot"
          aria-label="Alert"
          role="status"
          className="absolute right-1 top-1 size-1.5 rounded-full bg-[var(--color-nav-alert)]"
        />
      )}
    </button>
  )
}
