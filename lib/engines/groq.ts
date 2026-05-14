const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export const GROQ_MODELS = {
  scout: {
    id: "meta-llama/llama-4-scout-17b-16e-instruct",
    label: "Llama 4 Scout",
    note: "30K TPM",
  },
  compound: {
    id: "compound-beta",
    label: "Compound Beta",
    note: "70K TPM",
  },
} as const;

export type GroqModelKey = keyof typeof GROQ_MODELS;

export type ChatMessage = { role: "user" | "assistant"; content: string };

export async function callGroq(
  systemPrompt: string,
  messages: ChatMessage[],
  model: GroqModelKey = "scout",
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODELS[model].id,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.65,
      max_tokens: 8192,
      top_p: 0.9,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error ${response.status}: ${err}`);
  }

  const result = await response.json();
  const text = result?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned no content");
  return text;
}
