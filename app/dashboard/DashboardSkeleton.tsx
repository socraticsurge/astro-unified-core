// Server-rendered shell shown instantly while DashboardLoader resolves DB queries.
// Matches the rough layout of DashboardClient so the transition is seamless.
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* NavBar placeholder */}
      <div className="h-14 border-b border-border/40 flex items-center px-4 gap-3 shrink-0">
        <div className="w-32 h-4 rounded bg-muted animate-pulse" />
        <div className="flex-1" />
        <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
      </div>

      {/* Content area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar placeholder */}
        <div className="hidden md:flex flex-col w-56 border-r border-border/40 p-3 gap-2 shrink-0">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-10 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>

        {/* Main content placeholder */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
          <div className="w-48 h-4 rounded bg-muted animate-pulse" />
          <div className="w-32 h-3 rounded bg-muted/60 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
