export function SectionHeading({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="ac-section-head">
      <div className="ac-section-title">{children}</div>
      {action}
    </div>
  );
}
