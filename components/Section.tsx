"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type Props = {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  accent?: string; // tailwind text color class e.g. "text-blue-800"
};

export function Section({ title, defaultOpen = true, children, accent = "text-gray-800" }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between py-3 px-1 text-left hover:bg-black/5 transition-colors`}
      >
        <span className={`font-semibold text-sm uppercase tracking-wide ${accent}`}>{title}</span>
        {open
          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
          : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="pb-4 px-1">{children}</div>}
    </div>
  );
}
