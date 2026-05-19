"use client";
import { useState, useRef, useEffect } from "react";
import { Send, RefreshCw, Trash2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModelPicker } from "@/components/ui/ModelPicker";
import { DEFAULT_CHAT_MODEL, type AiModelKey } from "@/lib/engines/models";
import type { ChatMessage } from "@/lib/engines/groq";

type Props = {
  profileId: string;
};

export function ProfileChat({ profileId }: Props) {
  const [model, setModel] = useState<AiModelKey>(DEFAULT_CHAT_MODEL);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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
      const res = await fetch("/api/readings/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: profileId, messages: next, model }),
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = () => { setMessages([]); setError(null); };
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const copyMessage = async (idx: number, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(i => i === idx ? null : i), 2000);
  };

  return (
    <div className="flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] overflow-hidden" style={{ height: "620px" }}>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-[var(--color-border-subtle)]">
        <ModelPicker value={model} onChange={setModel} disabled={loading} />

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[var(--color-ink-4)]">chart-grounded · in-memory</span>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-[var(--color-ink-2)] transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !loading && (
          <p className="text-xs text-muted-foreground text-center py-10 italic leading-relaxed">
            Ask anything about this chart.
          </p>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2.5 text-sm leading-relaxed ${
              m.role === "user"
                ? "bg-[var(--color-accent-faint)] border border-[var(--color-accent-dim)] text-[var(--color-ink-1)]"
                : "bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-foreground/90"
            }`}>
              <MessageContent content={m.content} />
              {m.role === "assistant" && (
                <div className="flex justify-end mt-1.5">
                  <button
                    onClick={() => copyMessage(i, m.content)}
                    className="flex items-center gap-1 text-[10px] text-[var(--color-ink-4)] hover:text-[var(--color-ink-3)] transition-colors"
                    title="Copy response"
                  >
                    {copiedIdx === i ? <Check className="h-3 w-3 text-[var(--color-success)]" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg px-3 py-2.5">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-violet-400" />
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-[var(--color-danger)] text-center py-1">{error}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--color-border)] p-3 flex gap-2 items-end">
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this chart… (Enter to send, Shift+Enter for new line)"
          disabled={loading}
          className="flex-1 bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-violet-500/50 disabled:opacity-50 resize-none"
        />
        <Button
          onClick={send}
          disabled={!input.trim() || loading}
          size="sm"
          className="h-9 w-9 p-0 bg-[var(--color-accent)] hover:opacity-90 text-[var(--color-button-fg)] border-0 shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const paragraphs = content.split(/\n\n+/);
  return (
    <div className="space-y-2">
      {paragraphs.map((para, i) => {
        if (para.trim().startsWith("- ") || para.trim().startsWith("* ")) {
          const items = para.split("\n").filter((l) => l.trim());
          return (
            <ul key={i} className="space-y-0.5 pl-3">
              {items.map((item, j) => (
                <li key={j} className="text-sm flex gap-1.5">
                  <span className="text-violet-400/60 shrink-0">·</span>
                  <InlineText text={item.replace(/^[-*]\s*/, "")} />
                </li>
              ))}
            </ul>
          );
        }
        if (para.trim().match(/^#{1,3}\s/)) {
          return (
            <p key={i} className="text-sm font-semibold text-[var(--color-ink-1)]">
              {para.replace(/^#{1,3}\s*/, "")}
            </p>
          );
        }
        return (
          <p key={i} className="text-sm whitespace-pre-wrap">
            <InlineText text={para} />
          </p>
        );
      })}
    </div>
  );
}

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i} className="font-semibold text-[var(--color-ink-1)]">{part.slice(2, -2)}</strong>;
        if (part.startsWith("`") && part.endsWith("`"))
          return <code key={i} className="font-mono text-xs bg-[var(--color-border)] px-1 rounded text-[var(--color-ink-2)]">{part.slice(1, -1)}</code>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
