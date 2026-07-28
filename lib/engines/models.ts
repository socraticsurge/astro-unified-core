// Unified AI model registry — single source of truth for all AI features.
// Every model picker in the app reads from here.
//
// GPT-OSS 120B is a Groq production model. It is the single active model so
// every AI feature shares one provider contract and one staging credential.

export const AI_MODELS = {
  "groq-gpt-oss-120b": {
    label: "GPT-OSS 120B · Groq",
    provider: "groq" as const,
    id: "openai/gpt-oss-120b",
  },
} as const;

export type AiModelKey = keyof typeof AI_MODELS;

export const DEFAULT_INSIGHT_MODEL: AiModelKey = "groq-gpt-oss-120b";
export const DEFAULT_CHAT_MODEL: AiModelKey = "groq-gpt-oss-120b";
export const DEFAULT_DRAFT_MODEL: AiModelKey = "groq-gpt-oss-120b";

const VALID_KEYS = new Set(Object.keys(AI_MODELS));
const LEGACY_KEYS = new Set(["gemini-flash", "gemma-4-31b-it", "groq-scout"]);

export function resolveModel(key: unknown, fallback: AiModelKey): AiModelKey {
  if (typeof key === "string" && LEGACY_KEYS.has(key)) return fallback;
  return typeof key === "string" && VALID_KEYS.has(key) ? (key as AiModelKey) : fallback;
}

// Shared message shape for all chat-style providers.
export type ChatMessage = { role: "user" | "assistant"; content: string };
