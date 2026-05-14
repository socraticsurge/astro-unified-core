const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Keyed models used by the chat UI toggle (backward compat)
export const GROQ_MODELS = {
  scout: {
    id: "meta-llama/llama-4-scout-17b-16e-instruct",
    label: "Llama 4 Scout",
  },
  compound: {
    id: "gemma-4-31b-it",
    label: "Gemma 4 31B",
  },
} as const;

export type GroqModelKey = keyof typeof GROQ_MODELS;

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type GroqCallOpts = {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  json_mode?: boolean;
};

// Low-level call using a raw model ID — used by ai-caller.ts
export async function callGroqById(
  modelId: string,
  systemPrompt: string,
  messages: ChatMessage[],
  opts?: GroqCallOpts,
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");

  const body: Record<string, unknown> = {
    model: modelId,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    temperature: opts?.temperature ?? 0.65,
    max_tokens: opts?.max_tokens ?? 8192,
    top_p: opts?.top_p ?? 0.9,
  };
  if (opts?.json_mode) body.response_format = { type: "json_object" };

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    let detail = err;
    try { detail = JSON.parse(err)?.error?.message ?? err; } catch { /* keep raw */ }
    throw new Error(`[Groq ${modelId}] ${response.status}: ${detail}`);
  }

  const result = await response.json();
  const text = result?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned no content");
  return text;
}

// Named-model call used by the chat UI components
export async function callGroq(
  systemPrompt: string,
  messages: ChatMessage[],
  model: GroqModelKey = "scout",
  opts?: GroqCallOpts,
): Promise<string> {
  return callGroqById(GROQ_MODELS[model].id, systemPrompt, messages, opts);
}
