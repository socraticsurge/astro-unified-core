// Unified AI caller — routes to the correct provider based on model key.
// All AI features (insights, chat, drafts) go through these two functions.

import { AI_MODELS, type AiModelKey } from "./models";
import { callGemini, callGeminiText } from "./gemini";
import { callGroqById } from "./groq";
import type { ChatMessage } from "./groq";

export type AiCallOpts = {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
};

// For structured JSON output — AI insights. Gemini uses responseMimeType JSON;
// Groq uses response_format json_object. Both return a parsed JS object.
export async function callAIForJson(
  model: AiModelKey,
  systemPrompt: string,
  userPrompt: string,
  opts?: AiCallOpts,
): Promise<unknown> {
  const m = AI_MODELS[model];

  if (m.provider === "gemini") {
    return callGemini(systemPrompt, userPrompt, {
      temperature: opts?.temperature,
      maxOutputTokens: opts?.maxTokens,
    });
  }

  // Groq: convert single user prompt to messages, enable json_mode
  const text = await callGroqById(m.id, systemPrompt, [{ role: "user", content: userPrompt }], {
    temperature: opts?.temperature,
    max_tokens: opts?.maxTokens,
    top_p: opts?.topP,
    json_mode: true,
  });
  return JSON.parse(text);
}

// For prose text output — chat and draft generation.
export async function callAIForText(
  model: AiModelKey,
  systemPrompt: string,
  messages: ChatMessage[],
  opts?: AiCallOpts,
): Promise<string> {
  const m = AI_MODELS[model];

  if (m.provider === "gemini") {
    return callGeminiText(systemPrompt, messages, {
      temperature: opts?.temperature,
      maxOutputTokens: opts?.maxTokens,
    });
  }

  return callGroqById(m.id, systemPrompt, messages, {
    temperature: opts?.temperature,
    max_tokens: opts?.maxTokens,
    top_p: opts?.topP,
  });
}
