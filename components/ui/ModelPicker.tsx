"use client";
import { AI_MODELS, type AiModelKey } from "@/lib/engines/models";

type Props = {
  value: AiModelKey;
  onChange: (model: AiModelKey) => void;
  disabled?: boolean;
};

export function ModelPicker({ value, onChange, disabled }: Props) {
  return (
    <div className="flex items-center gap-0.5">
      {(Object.entries(AI_MODELS) as [AiModelKey, (typeof AI_MODELS)[AiModelKey]][]).map(([key, m]) => (
        <button
          key={key}
          disabled={disabled}
          onClick={() => onChange(key)}
          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors disabled:opacity-40 ${
            value === key
              ? "bg-violet-700/50 text-violet-200 border border-violet-600/50"
              : "text-muted-foreground hover:text-[var(--color-ink-2)] border border-transparent hover:border-[var(--color-border)]"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
