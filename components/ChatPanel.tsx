"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };
type Props = { profileId: string; profileName: string };

export function ChatPanel({ profileId, profileName }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [model, setModel] = useState("llama3.1:8b");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/chat?profile_id=${profileId}`)
      .then((r) => r.json())
      .then((data: Array<{ role: string; content: string }>) => {
        setMessages(data.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
      });
  }, [profileId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || streaming) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setStreaming(true);
    let assistantContent = "";
    setMessages((m) => [...m, { role: "assistant", content: "▌" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: profileId, message: userMsg, model }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: `[Error: ${err.error ?? "Ollama unavailable"}]` }]);
        return;
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        for (const line of text.split("\n").filter(Boolean)) {
          try {
            const json = JSON.parse(line);
            const token: string = json?.message?.content ?? "";
            assistantContent += token;
            setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: assistantContent + "▌" }]);
          } catch { /* incomplete JSON line — skip */ }
        }
      }
      setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: assistantContent }]);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Chat about {profileName}&apos;s chart</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Model:</span>
          <Input value={model} onChange={(e) => setModel(e.target.value)} className="h-6 text-xs w-36 px-1" />
        </div>
      </div>

      <ScrollArea className="flex-1 border rounded-lg p-3 bg-muted/20">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-8">
            Ask anything about {profileName}&apos;s chart. Ollama uses the fetched engine data as context.
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && <Bot className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />}
            <div className={`rounded-lg px-3 py-2 max-w-[80%] text-sm whitespace-pre-wrap ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-background border"}`}>
              {msg.content}
            </div>
            {msg.role === "user" && <User className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />}
          </div>
        ))}
        <div ref={bottomRef} />
      </ScrollArea>

      <div className="flex gap-2 mt-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the chart..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          disabled={streaming}
        />
        <Button onClick={sendMessage} disabled={streaming || !input.trim()} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
