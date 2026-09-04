// Google generative-language API client. Used for any model Google hosts on
// `generativelanguage.googleapis.com` — both Gemini (e.g. gemini-3.1-flash-lite)
// and Gemma (e.g. gemma-4-31b-it) families share the same endpoint shape, so
// we parameterize on the model id rather than baking one in.

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function endpoint(modelId: string) {
  return `${GEMINI_API_BASE}/${modelId}:generateContent`;
}

export type GeminiCallOpts = {
  temperature?: number;
  maxOutputTokens?: number;
};

// JSON mode — forces structured output. Used for AI insights.
export async function callGemini(
  modelId: string,
  systemPrompt: string,
  userPrompt: string,
  opts?: GeminiCallOpts,
): Promise<unknown> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not set");

  const response = await fetch(endpoint(modelId), {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: opts?.temperature ?? 0.5,
        maxOutputTokens: opts?.maxOutputTokens ?? 4096,
      },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content");
  return JSON.parse(text);
}

// Text mode — conversational output. Used for chat and drafts.
export async function callGeminiText(
  modelId: string,
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  opts?: GeminiCallOpts,
): Promise<string> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not set");

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const response = await fetch(endpoint(modelId), {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: opts?.temperature ?? 0.65,
        maxOutputTokens: opts?.maxOutputTokens ?? 8192,
      },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content");
  return text;
}
