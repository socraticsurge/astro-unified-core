// Shared loading placeholder for tabs that are still fetching their data.
// Replaces the prior mix of "Loading…" text labels and bare paragraphs with
// a single calm pulsing-card pattern.
//
//   <TabLoadingSkeleton />
//   <TabLoadingSkeleton lines={5} />
//
// The component renders no copy — by design, the skeleton itself is the
// signal. Pair it with the existing `TabSection` if you want a heading too.

interface Props {
  /** Number of "line" placeholders per card. Defaults to 4. */
  lines?: number;
  /** Number of card blocks. Defaults to 1. */
  cards?: number;
  /** Pass `false` to render the skeleton without the outer card chrome. */
  framed?: boolean;
}

export function TabLoadingSkeleton({ lines = 4, cards = 1, framed = true }: Props) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className={framed ? "ac-card ac-card-pad space-y-3" : "space-y-3"}
        >
          {Array.from({ length: lines }).map((_, j) => (
            <div
              key={j}
              className="h-3 rounded bg-[var(--color-surface-2)] animate-pulse"
              style={{ width: `${100 - j * 7}%`, maxWidth: "100%" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
