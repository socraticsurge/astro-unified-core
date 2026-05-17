import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { textStyles } from "@/lib/typography";

type Props = {
  title: string;
  subtitle?: string;
  /** href to navigate back to — renders a chevron-left back button */
  back?: string;
  /** Slot for action buttons (edit, refresh, etc.) rendered on the right */
  actions?: React.ReactNode;
};

/**
 * Consistent page header used on all sub-pages.
 * back= renders a back button. actions= renders right-side buttons.
 * Used on: profile detail, compatibility detail, consultation, new/edit profile.
 */
export function PageHeader({ title, subtitle, back, actions }: Props) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-center gap-2 min-w-0">
        {back && (
          <Link
            href={back}
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-[var(--radius-sm)] text-[var(--color-ink-3)] hover:text-[var(--color-ink-1)] hover:bg-[var(--color-surface-hover)] transition-all"
            aria-label="Go back"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        )}
        <div className="min-w-0">
          <h1 style={textStyles.pageTitle} className="truncate">{title}</h1>
          {subtitle && (
            <p style={{ ...textStyles.small, marginTop: "2px" }}>{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          {actions}
        </div>
      )}
    </div>
  );
}
