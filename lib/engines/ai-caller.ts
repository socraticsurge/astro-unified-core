// Unified AI caller — routes to the correct provider based on model key.
// All AI features (insights, chat, drafts) go through these two functions.
//
// As of 2026-06-24 every active model in the registry is served via the
// Google generative-language API (Gemini + Gemma share the same endpoint).
// To re-introduce another provider, add it to AI_MODELS with a distinct
// `provider` value and branch on it below.

import { AI_MODELS, type AiModelKey, type ChatMessage } from "./models";
import { callGemini, callGeminiText } from "./gemini";

export type AiCallOpts = {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
};

// For structured JSON output — AI insights.
export async function callAIForJson(
  model: AiModelKey,
  systemPrompt: string,
  userPrompt: string,
  opts?: AiCallOpts,
): Promise<unknown> {
  const m = AI_MODELS[model];
  return callGemini(m.id, systemPrompt, userPrompt, {
    temperature: opts?.temperature,
    maxOutputTokens: opts?.maxTokens,
  });
}

// For prose text output — chat and draft generation.
export async function callAIForText(
  model: AiModelKey,
  systemPrompt: string,
  messages: ChatMessage[],
  opts?: AiCallOpts,
): Promise<string> {
  const m = AI_MODELS[model];
  return callGeminiText(m.id, systemPrompt, messages, {
    temperature: opts?.temperature,
    maxOutputTokens: opts?.maxTokens,
  });
}
