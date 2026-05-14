"use client";
import { useState, useRef, useEffect } from "react";
import { Send, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GROQ_MODELS } from "@/lib/engines/groq";
import type { ChatMessage, GroqModelKey } from "@/lib/engines/groq";

type Props = {
  profileId: string;
};

export function ProfileChat({ profileId }: Props) {
  const [model, setModel] = useState<GroqModelKey>("scout");
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

  return (
    <div className="flex flex-col rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden" style={{ height: "620px" }}>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-white/5">
        {/* Model selector */}
        <div className="flex items-center gap-1">
          {(Object.entries(GROQ_MODELS) as [GroqModelKey, typeof GROQ_MODELS[GroqModelKey]][]).map(([key, m]) => (
            <button
              key={key}
              onClick={() => setModel(key)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                model === key
                  ? "bg-violet-700/50 text-violet-200 border border-violet-600/50"
                  : "text-muted-foreground hover:text-white/60 border border-transparent hover:border-white/10"
              }`}
            >
              {m.label}
              <span className="ml-1 opacity-50">{m.note}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/20">chart-grounded · in-memory</span>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-white/60 transition-colors"
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
                ? "bg-violet-800/40 text-white"
                : "bg-white/[0.05] border border-white/10 text-foreground/90"
            }`}>
              <MessageContent content={m.content} />
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2.5">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-violet-400" />
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400 text-center py-1">{error}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/10 p-3 flex gap-2 items-end">
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this chart… (Enter to send, Shift+Enter for new line)"
          disabled={loading}
          className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-violet-500/50 disabled:opacity-50 resize-none"
        />
        <Button
          onClick={send}
          disabled={!input.trim() || loading}
          size="sm"
          className="h-9 w-9 p-0 bg-violet-700/60 hover:bg-violet-700/80 text-white border-0 shrink-0"
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
            <p key={i} className="text-sm font-semibold text-white/90">
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
          return <strong key={i} className="font-semibold text-white/90">{part.slice(2, -2)}</strong>;
        if (part.startsWith("`") && part.endsWith("`"))
          return <code key={i} className="font-mono text-xs bg-white/10 px-1 rounded text-violet-300">{part.slice(1, -1)}</code>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
