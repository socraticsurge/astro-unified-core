'use client'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { AppStarCanvas } from './AppStarCanvas'

interface AppShellProps {
  children: ReactNode
  navBar: ReactNode
  footer: ReactNode
  feedback: ReactNode
}

export function AppShell({ children, navBar, footer, feedback }: AppShellProps) {
  const pathname = usePathname()
  if (pathname === '/') {
    return <>{children}</>
  }
  return (
    <>
      {/* Fixed cosmic backdrop layers */}
      <AppStarCanvas />
      {/* Nebula accent: subtle radial glow near top-right and bottom-left */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 55% 40% at 80% 0%, rgba(99,60,180,0.10) 0%, transparent 70%),' +
            'radial-gradient(ellipse 40% 30% at 10% 100%, rgba(30,80,160,0.08) 0%, transparent 70%)',
        }}
      />

      {/* App content above backdrop (z-index 1+) */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {navBar}
        <main className="max-w-7xl mx-auto px-4 pt-8 pb-24 sm:py-8">{children}</main>
        {feedback}
        {footer}
      </div>
    </>
  )
}
