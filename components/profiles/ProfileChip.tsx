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
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      aria-pressed={isActive}
      aria-label={relationship ? `${name} · ${relationship}` : name}
      className={cn(
        'relative flex flex-col justify-center px-4 h-full border-b-2 transition-colors whitespace-nowrap',
        isActive
          ? 'border-[var(--color-nav-chip-active-text)] text-[var(--color-ink-1)]'
          : 'border-transparent text-muted-foreground hover:text-[var(--color-ink-2)]'
      )}
    >
      <span className="text-xs font-medium leading-tight">{name}</span>
      {relationship && (
        <span className="text-[9px] uppercase tracking-wider leading-none mt-0.5 opacity-50">
          {relationship}
        </span>
      )}
      {hasAlert && (
        <span
          data-testid="alert-dot"
          aria-label="Alert"
          role="status"
          className="absolute right-2 top-2.5 size-1.5 rounded-full bg-[var(--color-nav-alert)]"
        />
      )}
    </button>
  )
}
