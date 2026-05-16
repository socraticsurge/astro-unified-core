'use client'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

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
      {navBar}
      <main className="max-w-7xl mx-auto px-4 pt-8 pb-24 sm:py-8">{children}</main>
      {feedback}
      {footer}
    </>
  )
}
