// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { LlmSettingsPanel } from "./LlmSettingsPanel";

describe("LlmSettingsPanel Groq migration", () => {
  it("normalizes a stored legacy model to the active Groq production model", () => {
    render(
      <LlmSettingsPanel
        initialAiInsights={{
          temperature: 0.5,
          max_tokens: 4096,
          custom_instructions: "",
        }}
        initialChat={{
          temperature: 0.65,
          max_tokens: 8192,
          top_p: 0.9,
          custom_instructions: "",
          user_model: "gemma-4-31b-it",
          user_quota_per_month: 20,
        }}
        initialDraft={{
          temperature: 0.55,
          max_tokens: 4096,
          custom_instructions: "",
        }}
        initialTodayReading={{
          temperature: 0.55,
          max_tokens: 1024,
          custom_instructions: "",
        }}
      />,
    );

    expect(screen.getByText("AI Insights — Groq")).toBeInTheDocument();
    expect(screen.getByText("Chat — Groq")).toBeInTheDocument();
    expect(screen.getByText("Today Reading — Groq")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("groq-gpt-oss-120b");
    expect(
      (screen.getByRole("option", { name: "GPT-OSS 120B · Groq" }) as HTMLOptionElement)
        .selected,
    ).toBe(true);
  });
});
