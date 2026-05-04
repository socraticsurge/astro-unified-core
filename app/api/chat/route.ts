import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ollamaChat, buildSystemPrompt, OllamaMessage } from "@/lib/ollama";

export async function POST(req: NextRequest) {
  const { profile_id, message, model } = await req.json();

  const profile = db.profiles.get(profile_id);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const latestReadings = db.readings.latestPerEngine(profile_id);
  const engines = {
    vedastro: latestReadings["vedastro"]
      ? JSON.parse(latestReadings["vedastro"].output_data)
      : undefined,
    panchangam: latestReadings["panchangam"]
      ? JSON.parse(latestReadings["panchangam"].output_data)
      : undefined,
    jyotishganit: latestReadings["jyotishganit"]
      ? JSON.parse(latestReadings["jyotishganit"].output_data)
      : undefined,
  };

  const context_engines = (Object.keys(engines) as Array<keyof typeof engines>).filter(
    (k) => engines[k] !== undefined
  );

  const history = db.chat.listForProfile(profile_id);
  const historyMessages: OllamaMessage[] = history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const systemPrompt = buildSystemPrompt(profile.name, engines);
  const messages: OllamaMessage[] = [
    { role: "system", content: systemPrompt },
    ...historyMessages,
    { role: "user", content: message },
  ];

  // Only save the user message after confirming Ollama is reachable,
  // so a failed stream doesn't leave an orphaned user message in history.
  const ollamaStream = await ollamaChat(messages, model ?? "llama3.1:8b");
  db.chat.save({ profile_id, role: "user", content: message, context_engines });

  let fullResponse = "";
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const transformStream = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      const text = decoder.decode(chunk, { stream: true });
      for (const line of text.split("\n").filter(Boolean)) {
        try {
          const json = JSON.parse(line);
          const token: string = json?.message?.content ?? "";
          fullResponse += token;
          controller.enqueue(encoder.encode(line + "\n"));
        } catch {
          controller.enqueue(chunk);
        }
      }
    },
    flush() {
      if (fullResponse) {
        db.chat.save({
          profile_id,
          role: "assistant",
          content: fullResponse,
          context_engines,
        });
      }
    },
  });

  ollamaStream.pipeTo(transformStream.writable);

  return new Response(transformStream.readable, {
    headers: { "Content-Type": "text/event-stream" },
  });
}

export async function GET(req: NextRequest) {
  const profile_id = req.nextUrl.searchParams.get("profile_id");
  if (!profile_id) return NextResponse.json({ error: "profile_id required" }, { status: 400 });
  const messages = db.chat.listForProfile(profile_id);
  return NextResponse.json(messages);
}
