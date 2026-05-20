import React from "react";

// ── Two-column tab layout ───────────────────────────────────────────────────
//
// The canonical responsive layout for dense tab content. Two columns on
// `lg:` and up, single column on smaller breakpoints. Use this for any tab
// that has roughly equal-weight content blocks the user can scan in parallel.
//
//   <TwoColumnTabGrid>
//     <TabColumn>
//       <TabSection title="What's active now" when={shifts.length > 0}>
//         …
//       </TabSection>
//       <TabSection title="Current dasha period">
//         …
//       </TabSection>
//     </TabColumn>
//     <TabColumn>
//       <TabSection title="Your natal chart">…</TabSection>
//     </TabColumn>
//   </TwoColumnTabGrid>

interface TwoColumnTabGridProps {
  children: React.ReactNode;
  className?: string;
}

export function TwoColumnTabGrid({ children, className }: TwoColumnTabGridProps) {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 ${className ?? ""}`}>
      {children}
    </div>
  );
}

export function TabColumn({ children }: { children: React.ReactNode }) {
  return <div className="space-y-6 min-w-0">{children}</div>;
}

// ── Section with built-in empty-state policy ────────────────────────────────
//
// Render nothing — including the heading — when the section has nothing to
// show. Avoids the "No significant patterns active right now" anti-pattern.
//
//   <TabSection title="What's active now" when={shifts.length > 0}>
//     {shifts.map(...)}
//   </TabSection>
//
// `when` defaults to `true`; pass an explicit `false` (or a falsy expression)
// to suppress rendering. The heading is rendered as an `.ac-eyebrow` for
// consistency with the rest of the unified dashboard.

interface TabSectionProps {
  title?: string;
  when?: boolean;
  children: React.ReactNode;
  /** When provided, rendered to the right of the heading (e.g. a refresh button). */
  trailing?: React.ReactNode;
  className?: string;
}

export function TabSection({ title, when = true, children, trailing, className }: TabSectionProps) {
  if (!when) return null;
  return (
    <section className={`space-y-2 ${className ?? ""}`}>
      {title && (
        <div className="flex items-center justify-between">
          <div className="ac-eyebrow">{title}</div>
          {trailing}
        </div>
      )}
      <div>{children}</div>
    </section>
  );
}
