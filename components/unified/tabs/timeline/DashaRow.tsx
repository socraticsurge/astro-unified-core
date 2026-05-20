"use client"
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

export interface DashaPeriodEntry {
  planet: string
  start: string
  end: string
  isCurrentPeriod: boolean
  antardashas?: DashaPeriodEntry[]
  pratyantardashas?: DashaPeriodEntry[]
  sukshmadhashas?: DashaPeriodEntry[]
  pranadashas?: DashaPeriodEntry[]
}

const LEVEL_STYLES = [
  'text-[var(--color-ink-1)] font-bold text-[13px]',
  'text-[var(--color-ink-2)] text-[12px]',
  'text-muted-foreground text-[11px]',
  'text-muted-foreground text-[10px]',
  'text-muted-foreground text-[10px]',
]

function getChildren(entry: DashaPeriodEntry): DashaPeriodEntry[] {
  return entry.antardashas
    ?? entry.pratyantardashas
    ?? entry.sukshmadhashas
    ?? entry.pranadashas
    ?? []
}

interface DashaRowProps {
  entry: DashaPeriodEntry
  level: number
  defaultExpanded?: boolean
}

export function DashaRow({ entry, level, defaultExpanded = false }: DashaRowProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const children = getChildren(entry)
  const hasChildren = children.length > 0
  const indent = level * 16

  return (
    <div>
      <button
        type="button"
        aria-expanded={hasChildren ? expanded : undefined}
        aria-controls={hasChildren ? `dasha-children-${entry.planet}-${level}` : undefined}
        onClick={() => hasChildren && setExpanded(e => !e)}
        className={cn(
          'w-full flex items-center gap-2 py-1.5 px-2 rounded text-left hover:bg-[var(--color-surface-1)] transition-colors',
          entry.isCurrentPeriod ? 'text-[var(--color-accent)]' : LEVEL_STYLES[Math.min(level, 4)]
        )}
        style={{ paddingLeft: `${8 + indent}px` }}
      >
        {hasChildren && (
          <ChevronRight
            className={cn('w-3 h-3 flex-shrink-0 transition-transform', expanded && 'rotate-90')}
          />
        )}
        {!hasChildren && <span className="w-3 flex-shrink-0" />}

        <span className="font-semibold w-20 flex-shrink-0">{entry.planet}</span>
        <span className="text-muted-foreground text-[10px]">{entry.start} → {entry.end}</span>
        {entry.isCurrentPeriod && (
          <span className="ml-auto text-[var(--color-accent)] text-[10px] font-bold">● now</span>
        )}
      </button>

      {expanded && (
        <div id={`dasha-children-${entry.planet}-${level}`}>
          {children.map((child, i) => (
            <DashaRow
              key={`${level}-${i}-${child.planet}`}
              entry={child}
              level={level + 1}
              defaultExpanded={child.isCurrentPeriod}
            />
          ))}
        </div>
      )}
    </div>
  )
}
