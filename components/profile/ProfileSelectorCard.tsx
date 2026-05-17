"use client";
import Link from "next/link";
import { ProfileAvatar } from "./ProfileAvatar";
import { textStyles, colors, fonts, scale, clamp, interactive } from "@/lib/typography";

interface ProfileSelectorCardProps {
  name: string;
  subtitle?: string;           // relationship, location, or any one-line descriptor
  incomplete?: boolean;        // shows "complete profile" nudge, links instead of button
  incompleteHref?: string;     // where to send user to complete the profile
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function ProfileSelectorCard({
  name,
  subtitle,
  incomplete = false,
  incompleteHref,
  selected = false,
  onSelect,
  className,
}: ProfileSelectorCardProps) {
  const border  = selected  ? "rgba(251,191,36,0.50)" : incomplete ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.09)";
  const bg      = selected  ? "rgba(251,191,36,0.07)" : incomplete ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.03)";
  const shadow  = selected  ? "0 0 24px rgba(251,191,36,0.10)" : "none";
  const opacity = incomplete ? 0.5 : 1;

  const avatarColor     = selected ? colors.goldFaint : undefined;
  const avatarTextColor = selected ? colors.gold : undefined;

  const cardStyle: React.CSSProperties = {
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: "16px",
    padding: "16px 12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    textAlign: "center",
    boxShadow: shadow,
    opacity,
    cursor: incomplete ? "default" : "pointer",
    textDecoration: "none",
    height: "100%",
  };

  const nameStyle: React.CSSProperties = {
    ...fonts.display,
    ...clamp.one,
    fontSize: scale.label,
    lineHeight: 1.3,
    color: selected ? colors.primary : colors.secondary,
  };

  const subtitleStyle: React.CSSProperties = {
    ...textStyles.meta,
    letterSpacing: "0.06em",
    textTransform: "capitalize",
    color: selected ? colors.goldDim : colors.muted,
  };

  const incompleteNudge: React.CSSProperties = {
    ...textStyles.meta,
    letterSpacing: "0.06em",
    color: colors.goldDim,
  };

  const content = (
    <>
      <ProfileAvatar
        name={name}
        size="sm"
        color={avatarColor}
        textColor={avatarTextColor}
      />
      <div style={nameStyle}>{name}</div>
      {subtitle && !incomplete && (
        <div style={subtitleStyle}>{subtitle}</div>
      )}
      {incomplete && (
        <div style={incompleteNudge}>complete profile</div>
      )}
    </>
  );

  if (incomplete && incompleteHref) {
    return (
      <Link href={incompleteHref} style={cardStyle} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onSelect} style={cardStyle} className={`${interactive.card} ${className ?? ""}`}>
      {content}
    </button>
  );
}
