import { fonts, colors } from "@/lib/typography";

const SIZE_MAP = {
  sm: { outer: 36,  font: "0.8rem"  },
  md: { outer: 48,  font: "1rem"    },
  lg: { outer: 64,  font: "1.2rem"  },
  xl: { outer: 88,  font: "1.6rem"  },
} as const;

type AvatarSize = keyof typeof SIZE_MAP;

interface ProfileAvatarProps {
  name: string;
  size?: AvatarSize;
  color?: string;       // background color — defaults to glass white
  textColor?: string;   // initials color — defaults to white/70
  className?: string;
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

export function ProfileAvatar({
  name,
  size = "md",
  color,
  textColor,
  className,
}: ProfileAvatarProps) {
  const { outer, font } = SIZE_MAP[size];
  const bg   = color     ?? "var(--color-surface-2)";
  const text = textColor ?? colors.secondary;

  return (
    <div
      className={className}
      style={{
        width: outer,
        height: outer,
        borderRadius: "50%",
        background: bg,
        border: `var(--border-width) solid var(--color-border)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        ...fonts.displayBold,
        fontSize: font,
        color: text,
        userSelect: "none",
      }}
    >
      {getInitials(name)}
    </div>
  );
}
