"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Trash2, Copy, Check } from "lucide-react";
import { ModelPicker } from "@/components/ui/ModelPicker";
import { DEFAULT_CHAT_MODEL, type AiModelKey } from "@/lib/engines/models";
import type { ChatMessage } from "@/lib/engines/groq";

function MessageContent({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return <p key={i} className="font-semibold text-foreground/90 mt-2">{line.slice(3)}</p>;
        if (line.startsWith("- ") || line.startsWith("* ")) return <p key={i} className="pl-3 before:content-['·'] before:mr-2 before:text-muted-foreground">{line.slice(2)}</p>;
        if (!line.trim()) return <div key={i} className="h-1.5" />;
        const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
        return (
          <p key={i}>
            {parts.map((part, j) => {
              if (part.startsWith("**") && part.endsWith("**")) return <strong key={j}>{part.slice(2, -2)}</strong>;
              if (part.startsWith("`") && part.endsWith("`")) return <code key={j} className="text-[11px] bg-[var(--color-surface-hover)] rounded px-1 font-mono">{part.slice(1, -1)}</code>;
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
}

type Props = {
  checkId: string;
  name1: string;
  name2: string;
};

export function CompatibilityChat({ checkId, name1, name2 }: Props) {
  const [model, setModel] = useState<AiModelKey>(DEFAULT_CHAT_MODEL);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const copyMessage = async (idx: number, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(i => i === idx ? null : i), 2000);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/readings/chat/compatibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ check_id: checkId, messages: next, model }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setMessages([...next, { role: "assistant", content: data.response }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] overflow-hidden" style={{ height: "580px" }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-[var(--color-border-subtle)]">
        <ModelPicker value={model} onChange={setModel} disabled={loading} />
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[var(--color-ink-4)]">{name1} &amp; {name2} · in-memory</span>
          {messages.length > 0 && (
            <button onClick={() => { setMessages([]); setError(null); }} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-[var(--color-ink-2)] transition-colors">
              <Trash2 className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground/50 text-center pt-8">
            Ask anything about {name1} &amp; {name2}'s compatibility — chart placements, timing, dynamics.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="h-6 w-6 rounded-full bg-violet-900/60 border border-violet-700/40 flex items-center justify-center text-[10px] font-bold text-violet-300 shrink-0 mt-0.5">AI</div>
            )}
            <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${m.role === "user" ? "bg-[var(--color-accent-faint)] border border-[var(--color-accent-dim)] text-[var(--color-ink-1)]" : "bg-[var(--color-surface-1)] border border-[var(--color-border)] text-foreground/90"}`}>
              {m.role === "assistant" ? <MessageContent text={m.content} /> : <p>{m.content}</p>}
              {m.role === "assistant" && (
                <div className="flex justify-end mt-1.5">
                  <button
                    onClick={() => copyMessage(i, m.content)}
                    className="flex items-center gap-1 text-[10px] text-[var(--color-ink-4)] hover:text-[var(--color-ink-3)] transition-colors"
                    title="Copy response"
                  >
                    {copiedIdx === i ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5 justify-start">
            <div className="h-6 w-6 rounded-full bg-violet-900/60 border border-violet-700/40 flex items-center justify-center text-[10px] font-bold text-violet-300 shrink-0 mt-0.5">AI</div>
            <div className="bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5">
              <div className="flex gap-1.5 items-center h-4">
                {[0, 1, 2].map(i => (
                  <span key={i} className="h-1.5 w-1.5 rounded-full bg-violet-400/60 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        {error && <p className="text-xs text-red-400 text-center">{error}</p>}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3 border-t border-[var(--color-border-subtle)] pt-2">
        <div className="flex gap-2 items-end">
          <textarea
            rows={2}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about compatibility, timing, dynamics… (Enter to send)"
            className="flex-1 resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-violet-400/50"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="h-9 w-9 rounded-lg bg-violet-700/40 hover:bg-violet-700/60 border border-violet-600/40 flex items-center justify-center text-violet-300 transition-colors disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
