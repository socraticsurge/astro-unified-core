// Unified AI model registry — single source of truth for all AI features.
// Every model picker in the app reads from here.
//
// 2026-06-24: Llama 4 Scout on Groq was retired (Groq deprecation schedule —
// shutdown July 17, 2026). We migrated chat + draft defaults to Gemma 4 31B IT,
// served by Google's generative-language API (same endpoint shape as Gemini,
// so no separate provider plumbing is required). Groq is no longer a provider
// — re-introduce by adding an entry with `provider: "groq"` and restoring
// lib/engines/groq.ts from git history (commit ea897f2 or earlier).

export const AI_MODELS = {
  "gemini-flash": {
    label: "Gemini 3.1 Flash Lite",
    provider: "gemini" as const,
    id: "gemini-3.1-flash-lite",
  },
  "gemma-4-31b-it": {
    label: "Gemma 4 31B IT",
    provider: "gemini" as const,
    id: "gemma-4-31b-it",
  },
} as const;

export type AiModelKey = keyof typeof AI_MODELS;

export const DEFAULT_INSIGHT_MODEL: AiModelKey = "gemini-flash";
export const DEFAULT_CHAT_MODEL: AiModelKey = "gemma-4-31b-it";
export const DEFAULT_DRAFT_MODEL: AiModelKey = "gemma-4-31b-it";

const VALID_KEYS = new Set(Object.keys(AI_MODELS));

export function resolveModel(key: unknown, fallback: AiModelKey): AiModelKey {
  return typeof key === "string" && VALID_KEYS.has(key) ? (key as AiModelKey) : fallback;
}

// Shared message shape for all chat-style providers.
export type ChatMessage = { role: "user" | "assistant"; content: string };
