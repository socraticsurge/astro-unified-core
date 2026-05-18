export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
      {children}
    </h3>
  );
}
