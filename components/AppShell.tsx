'use client'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { AppStarCanvas } from './AppStarCanvas'

interface AppShellProps {
  children: ReactNode
  navBar: ReactNode
  footer: ReactNode
  feedback: ReactNode
  rootUsesAppShell?: boolean
}

export function AppShell({ children, navBar, footer, feedback, rootUsesAppShell = false }: AppShellProps) {
  const pathname = usePathname()
  if (pathname === '/' && !rootUsesAppShell) {
    return <>{children}</>
  }

  // Dashboard owns its own NavBar, full-height layout, and no footer padding.
  if (pathname?.startsWith('/dashboard')) {
    return (
      <>
        <AppStarCanvas />
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            background:
              'repeating-linear-gradient(0deg, transparent 0, transparent 3.35rem, color-mix(in srgb, var(--color-accent) 4%, transparent) 3.4rem),' +
              'radial-gradient(ellipse at 8% 22%, color-mix(in srgb, var(--color-accent) 5%, transparent), transparent 24rem),' +
              'radial-gradient(ellipse at 92% 72%, color-mix(in srgb, var(--color-accent) 4%, transparent), transparent 28rem)',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, height: '100dvh', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </>
    )
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
