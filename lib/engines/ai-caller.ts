// Unified AI caller — routes every active model through Groq.
// All AI features (insights, chat, drafts) go through these two functions.

import { AI_MODELS, type AiModelKey, type ChatMessage } from "./models";
import { callGroq } from "./groq";

export type AiCallOpts = {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
};

function parseJsonResponse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1].trim());

    const objectStart = text.indexOf("{");
    const objectEnd = text.lastIndexOf("}");
    if (objectStart >= 0 && objectEnd > objectStart) {
      return JSON.parse(text.slice(objectStart, objectEnd + 1));
    }

    throw new Error("Groq returned an invalid JSON response");
  }
}

// For structured JSON output — AI insights.
export async function callAIForJson(
  model: AiModelKey,
  systemPrompt: string,
  userPrompt: string,
  opts?: AiCallOpts,
): Promise<unknown> {
  const m = AI_MODELS[model];
  const text = await callGroq(m.id, systemPrompt, [{ role: "user", content: userPrompt }], {
    temperature: opts?.temperature,
    maxTokens: opts?.maxTokens,
    topP: opts?.topP,
    jsonMode: true,
  });
  return parseJsonResponse(text);
}

// For prose text output — chat and draft generation.
export async function callAIForText(
  model: AiModelKey,
  systemPrompt: string,
  messages: ChatMessage[],
  opts?: AiCallOpts,
): Promise<string> {
  const m = AI_MODELS[model];
  return callGroq(m.id, systemPrompt, messages, {
    temperature: opts?.temperature,
    maxTokens: opts?.maxTokens,
    topP: opts?.topP,
  });
}
