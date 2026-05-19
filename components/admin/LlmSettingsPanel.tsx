"use client";
import { useState } from "react";
import type { AiInsightsLlmConfig, ChatLlmConfig, DraftLlmConfig } from "@/lib/db";

type Props = {
  initialAiInsights: AiInsightsLlmConfig;
  initialChat: ChatLlmConfig;
  initialDraft: DraftLlmConfig;
};

function NumberInput({
  label, value, onChange, min, max, step,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min} max={max} step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="flex-1 accent-[var(--color-accent)]"
        />
        <input
          type="number"
          min={min} max={max} step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || min)}
          className="w-20 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/50"
        />
      </div>
    </div>
  );
}

export function LlmSettingsPanel({ initialAiInsights, initialChat, initialDraft }: Props) {
  const [aiConfig, setAiConfig] = useState<AiInsightsLlmConfig>(initialAiInsights);
  const [chatConfig, setChatConfig] = useState<ChatLlmConfig>(initialChat);
  const [draftConfig, setDraftConfig] = useState<DraftLlmConfig>(initialDraft);
  const [aiSaving, setAiSaving] = useState(false);
  const [chatSaving, setChatSaving] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);
  const [chatSaved, setChatSaved] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  const saveAiInsights = async () => {
    setAiSaving(true);
    setAiError(null);
    setAiSaved(false);
    try {
      const res = await fetch("/api/admin/llm-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "ai_insights", config: aiConfig }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      setAiSaved(true);
      setTimeout(() => setAiSaved(false), 2500);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setAiSaving(false);
    }
  };

  const saveChat = async () => {
    setChatSaving(true);
    setChatError(null);
    setChatSaved(false);
    try {
      const res = await fetch("/api/admin/llm-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "chat", config: chatConfig }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      setChatSaved(true);
      setTimeout(() => setChatSaved(false), 2500);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setChatSaving(false);
    }
  };

  const saveDraft = async () => {
    setDraftSaving(true);
    setDraftError(null);
    setDraftSaved(false);
    try {
      const res = await fetch("/api/admin/llm-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "draft", config: draftConfig }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2500);
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setDraftSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">LLM Settings</h2>

      {/* AI Insights — Gemini */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 space-y-5">
        <div>
          <p className="text-sm font-medium">AI Insights — Gemini</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Used when generating tab summaries (natal, dashas, career, etc.).
            Changes apply to newly generated insights; cached ones are unaffected.
          </p>
        </div>

        <NumberInput
          label="Temperature (0 = precise, 1 = creative)"
          value={aiConfig.temperature}
          onChange={v => setAiConfig(c => ({ ...c, temperature: v }))}
          min={0} max={1} step={0.05}
        />

        <NumberInput
          label="Max Output Tokens"
          value={aiConfig.max_tokens}
          onChange={v => setAiConfig(c => ({ ...c, max_tokens: v }))}
          min={512} max={8192} step={256}
        />

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">
            Additional Instructions (appended to system prompt)
          </label>
          <textarea
            rows={4}
            value={aiConfig.custom_instructions}
            onChange={e => setAiConfig(c => ({ ...c, custom_instructions: e.target.value }))}
            placeholder="e.g. Always give special attention to career and wealth implications. Focus on actionable guidance."
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/50 resize-none"
          />
        </div>

        {aiError && <p className="text-xs text-[var(--color-danger)]">{aiError}</p>}

        <button
          disabled={aiSaving}
          onClick={saveAiInsights}
          className="text-xs bg-[var(--color-accent-faint)] hover:bg-[var(--color-accent-faint)]/80 border border-[var(--color-accent-dim)] text-[var(--color-accent)] px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
        >
          {aiSaving ? "Saving…" : aiSaved ? "Saved ✓" : "Save AI Insights Settings"}
        </button>
      </div>

      {/* Chat — Groq */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 space-y-5">
        <div>
          <p className="text-sm font-medium">Chat — Groq</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Used for the per-profile Chat tab. Applies to all new messages; model selection
            (Scout / Gemma 4 31B) remains in the chat UI.
          </p>
        </div>

        <NumberInput
          label="Temperature (0 = precise, 1 = creative)"
          value={chatConfig.temperature}
          onChange={v => setChatConfig(c => ({ ...c, temperature: v }))}
          min={0} max={1} step={0.05}
        />

        <NumberInput
          label="Max Output Tokens"
          value={chatConfig.max_tokens}
          onChange={v => setChatConfig(c => ({ ...c, max_tokens: v }))}
          min={512} max={8192} step={256}
        />

        <NumberInput
          label="Top P (nucleus sampling)"
          value={chatConfig.top_p}
          onChange={v => setChatConfig(c => ({ ...c, top_p: v }))}
          min={0.1} max={1} step={0.05}
        />

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">
            Additional Instructions (appended to system prompt)
          </label>
          <textarea
            rows={4}
            value={chatConfig.custom_instructions}
            onChange={e => setChatConfig(c => ({ ...c, custom_instructions: e.target.value }))}
            placeholder="e.g. Always respond in under 200 words. Be direct and avoid hedging."
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/50 resize-none"
          />
        </div>

        {chatError && <p className="text-xs text-[var(--color-danger)]">{chatError}</p>}

        <button
          disabled={chatSaving}
          onClick={saveChat}
          className="text-xs bg-[var(--color-accent-faint)] hover:bg-[var(--color-accent-faint)]/80 border border-[var(--color-accent-dim)] text-[var(--color-accent)] px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
        >
          {chatSaving ? "Saving…" : chatSaved ? "Saved ✓" : "Save Chat Settings"}
        </button>
      </div>

      {/* Draft — Consultation Assistant */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 space-y-5">
        <div>
          <p className="text-sm font-medium">Consultation Draft Assistant</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Used when generating draft answers for written consultation requests in the admin questions panel.
          </p>
        </div>

        <NumberInput
          label="Temperature (0 = precise, 1 = creative)"
          value={draftConfig.temperature}
          onChange={v => setDraftConfig(c => ({ ...c, temperature: v }))}
          min={0} max={1} step={0.05}
        />

        <NumberInput
          label="Max Output Tokens"
          value={draftConfig.max_tokens}
          onChange={v => setDraftConfig(c => ({ ...c, max_tokens: v }))}
          min={512} max={8192} step={256}
        />

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">
            Additional Instructions (appended to system prompt)
          </label>
          <textarea
            rows={4}
            value={draftConfig.custom_instructions}
            onChange={e => setDraftConfig(c => ({ ...c, custom_instructions: e.target.value }))}
            placeholder="e.g. Always end with a timing window for the next 6 months. Keep responses under 350 words."
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/50 resize-none"
          />
        </div>

        {draftError && <p className="text-xs text-[var(--color-danger)]">{draftError}</p>}

        <button
          disabled={draftSaving}
          onClick={saveDraft}
          className="text-xs bg-[var(--color-accent-faint)] hover:bg-[var(--color-accent-faint)]/80 border border-[var(--color-accent-dim)] text-[var(--color-accent)] px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
        >
          {draftSaving ? "Saving…" : draftSaved ? "Saved ✓" : "Save Draft Settings"}
        </button>
      </div>
    </div>
  );
}
