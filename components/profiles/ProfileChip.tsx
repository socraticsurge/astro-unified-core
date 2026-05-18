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
  const label = relationship ? `${name} · ${relationship}` : name

  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      aria-label={label}
      aria-pressed={isActive}
      className={cn(
        'relative flex items-center rounded-full border px-3 py-1.5 transition-colors whitespace-nowrap',
        isActive
          ? 'border-[var(--color-nav-chip-active-border)] bg-[var(--color-nav-chip-active-bg)] text-[var(--color-nav-chip-active-text)]'
          : 'border-[var(--color-border)] bg-transparent text-muted-foreground hover:border-[var(--color-nav-chip-active-border)]'
      )}
    >
      <span className="text-xs font-semibold leading-tight">
        {name}
      </span>
      {relationship && (
        <span className="ml-1 text-xs leading-tight opacity-60">
          · {relationship}
        </span>
      )}
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
