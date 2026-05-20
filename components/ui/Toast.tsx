"use client";
import * as React from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Toast system ────────────────────────────────────────────────────────────
//
// Lightweight global toast notifications for save / submit / delete feedback.
// Wrap `<ToastProvider>` once at the root (already done in app/layout.tsx) and
// call the `toast()` function from any client component.
//
//   import { toast } from "@/components/ui/Toast";
//   toast("Profile saved", "success");
//   toast("Couldn't save profile", "error");
//
// Toasts auto-dismiss after 3.5s by default. Pass `{ duration: 0 }` to keep
// one open until clicked.

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
  duration: number;
}

interface ToastContextValue {
  add: (message: string, kind?: ToastKind, opts?: { duration?: number }) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

let publish: ToastContextValue["add"] | null = null;

/**
 * Imperative toast helper — call from anywhere in client code.
 * Falls back to a console log if the provider hasn't mounted yet
 * (which only happens during SSR or before hydration).
 */
export function toast(message: string, kind: ToastKind = "info", opts?: { duration?: number }) {
  if (publish) {
    publish(message, kind, opts);
  } else if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.warn("[toast] called before <ToastProvider> mounted:", message);
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const counterRef = React.useRef(0);

  const dismiss = React.useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const add = React.useCallback<ToastContextValue["add"]>((message, kind = "info", opts) => {
    const id = ++counterRef.current;
    const duration = opts?.duration ?? 3500;
    setToasts((ts) => [...ts, { id, message, kind, duration }]);
    if (duration > 0) {
      window.setTimeout(() => dismiss(id), duration);
    }
  }, [dismiss]);

  // Wire the imperative `toast()` helper to the active provider instance.
  React.useEffect(() => {
    publish = add;
    return () => {
      if (publish === add) publish = null;
    };
  }, [add]);

  return (
    <ToastContext.Provider value={{ add }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const KIND_STYLES: Record<ToastKind, { icon: React.ReactNode; cls: string }> = {
  success: {
    icon: <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />,
    cls: "border-[var(--color-success-border)] bg-[var(--color-surface-1)]",
  },
  error: {
    icon: <AlertCircle className="h-4 w-4 text-[var(--color-danger)]" />,
    cls: "border-[var(--color-danger-border)] bg-[var(--color-surface-1)]",
  },
  info: {
    icon: <Info className="h-4 w-4 text-[var(--color-accent)]" />,
    cls: "border-[var(--color-border)] bg-[var(--color-surface-1)]",
  },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const { icon, cls } = KIND_STYLES[toast.kind];
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex items-start gap-2.5 min-w-[240px] max-w-sm rounded-lg border shadow-lg px-3.5 py-2.5 text-xs text-[var(--color-ink-1)]",
        "animate-in fade-in slide-in-from-right-2 duration-200",
        cls,
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="flex-1 leading-relaxed">{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-muted-foreground hover:text-[var(--color-ink-1)] transition-colors -mr-1 -my-0.5 p-0.5"
        aria-label="Dismiss"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

/** Hook form, for components that want to call toast() reactively. */
export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    // Same fallback as the imperative helper.
    return {
      toast: (message: string) => {
        if (typeof window !== "undefined") {
          // eslint-disable-next-line no-console
          console.warn("[useToast] no provider; falling back:", message);
        }
      },
    };
  }
  return { toast: ctx.add };
}
