// Unified AI model registry — single source of truth for all AI features.
// Every model picker in the app reads from here.

export const AI_MODELS = {
  "gemini-flash": {
    label: "Gemini Flash",
    provider: "gemini" as const,
    id: "gemini-3.1-flash-lite",
  },
  "groq-scout": {
    label: "Llama 4 Scout",
    provider: "groq" as const,
    id: "meta-llama/llama-4-scout-17b-16e-instruct",
  },
  "groq-gemma": {
    label: "Gemma 4 31B",
    provider: "groq" as const,
    id: "gemma-4-31b-it",
  },
} as const;

export type AiModelKey = keyof typeof AI_MODELS;

export const DEFAULT_INSIGHT_MODEL: AiModelKey = "gemini-flash";
export const DEFAULT_CHAT_MODEL: AiModelKey = "groq-scout";
export const DEFAULT_DRAFT_MODEL: AiModelKey = "groq-scout";
