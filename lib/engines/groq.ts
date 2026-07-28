import type { ChatMessage } from "./models";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export type GroqCallOptions = {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  jsonMode?: boolean;
};

type GroqCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

async function sendCompletion(
  apiKey: string,
  body: Record<string, unknown>,
): Promise<{ response: Response; result: GroqCompletionResponse }> {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });

  const result = await response.json().catch(() => ({})) as GroqCompletionResponse;
  return { response, result };
}

function rateLimitDelayMs(
  response: Response,
  result: GroqCompletionResponse,
): number {
  const headerSeconds = Number(response.headers?.get("retry-after"));
  if (Number.isFinite(headerSeconds) && headerSeconds >= 0) {
    return Math.min(15_000, Math.ceil(headerSeconds * 1_000) + 100);
  }

  const message = result.error?.message ?? "";
  const match = message.match(/try again in ([\d.]+)s/i);
  const messageSeconds = match?.[1] ? Number(match[1]) : Number.NaN;
  return Number.isFinite(messageSeconds) && messageSeconds >= 0
    ? Math.min(15_000, Math.ceil(messageSeconds * 1_000) + 100)
    : 1_500;
}

async function sendWithRateLimitRetry(
  apiKey: string,
  body: Record<string, unknown>,
): Promise<{ response: Response; result: GroqCompletionResponse }> {
  let completion = await sendCompletion(apiKey, body);
  if (completion.response.status !== 429) return completion;

  await new Promise((resolve) => {
    setTimeout(resolve, rateLimitDelayMs(completion.response, completion.result));
  });
  completion = await sendCompletion(apiKey, body);
  return completion;
}

export async function callGroq(
  modelId: string,
  systemPrompt: string,
  messages: ChatMessage[],
  options?: GroqCallOptions,
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");

  const body: Record<string, unknown> = {
    model: modelId,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    temperature: options?.temperature ?? 0.55,
    max_completion_tokens: options?.maxTokens ?? 4096,
    top_p: options?.topP ?? 0.9,
  };

  if (modelId.startsWith("openai/gpt-oss-")) {
    body.reasoning_effort = "low";
    body.include_reasoning = false;
  }

  if (options?.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  let { response, result } = await sendWithRateLimitRetry(apiKey, body);
  const errorMessage = result.error?.message ?? "";

  // Groq's JSON-object validator can reject an otherwise usable generation.
  // The prompt still requires JSON, so retry once without the response-format
  // constraint and let the caller parse the returned object.
  if (
    options?.jsonMode &&
    response.status === 400 &&
    /Failed to (?:validate|generate) JSON/i.test(errorMessage)
  ) {
    delete body.response_format;
    ({ response, result } = await sendWithRateLimitRetry(apiKey, body));
  }

  if (!response.ok) {
    throw new Error(
      `Groq API error ${response.status}: ${result.error?.message ?? "Request failed"}`,
    );
  }

  const text = result.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned no content");
  return text;
}
