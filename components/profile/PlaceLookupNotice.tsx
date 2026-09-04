import { cn } from "@/lib/utils";

/** Policy-visible guidance shared by every signed-in place-entry journey. */
export function PlaceLookupNotice({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      Place lookup uses OpenStreetMap data. Enter a city or town, not a street
      address.{" "}
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2"
      >
        © OpenStreetMap contributors
      </a>
    </p>
  );
}
