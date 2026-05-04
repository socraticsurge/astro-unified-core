const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";

export type OllamaMessage = { role: "user" | "assistant" | "system"; content: string };

export async function ollamaChat(
  messages: OllamaMessage[],
  model = "llama3.1:8b"
): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true }),
  });

  if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
  if (!res.body) throw new Error("Ollama returned no body");

  return res.body;
}

export function buildSystemPrompt(
  profileName: string,
  engines: { vedastro?: unknown; panchangam?: unknown; jyotishganit?: unknown }
): string {
  const sections: string[] = [
    `You are an expert Vedic astrology assistant. The user is asking about the birth chart of ${profileName}.`,
    `Answer in plain English. When you cite a calculation, mention which system it came from.`,
    `Be honest when systems disagree. Do not fabricate astrological facts.`,
    ``,
    `Here is the available chart data:`,
  ];

  if (engines.vedastro) {
    sections.push(
      `## VedAstro Output\n\`\`\`json\n${JSON.stringify(engines.vedastro, null, 2)}\n\`\`\``
    );
  }
  if (engines.panchangam) {
    sections.push(
      `## Panchangam Output\n\`\`\`json\n${JSON.stringify(engines.panchangam, null, 2)}\n\`\`\``
    );
  }
  if (engines.jyotishganit) {
    sections.push(
      `## Jyotishganit Output\n\`\`\`json\n${JSON.stringify(engines.jyotishganit, null, 2)}\n\`\`\``
    );
  }

  return sections.join("\n");
}
