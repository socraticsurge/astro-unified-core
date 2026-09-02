import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { credentialedDashaflowSidecarConfig } from "./dashaflow-config";

const TOKEN = "test-service-token-that-is-at-least-32-characters";

function env(
  url: string,
  overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    NODE_ENV: "development",
    DASHAFLOW_SIDECAR_URL: url,
    DASHAFLOW_SIDECAR_TOKEN: TOKEN,
    ...overrides,
  };
}

describe("credentialedDashaflowSidecarConfig", () => {
  it.each([32, 256])(
    "accepts a visible ASCII token at the shared %i-character boundary",
    (length) => {
      const token = "x".repeat(length);
      expect(credentialedDashaflowSidecarConfig(
        "/v1/profile/derive",
        env("https://sidecar.example", { DASHAFLOW_SIDECAR_TOKEN: token }),
      )).toEqual({
        url: "https://sidecar.example/v1/profile/derive",
        token,
      });
    },
  );

  it("resolves an HTTPS sidecar path in every Vercel environment", () => {
    for (const vercelEnv of [undefined, "development", "preview", "production"]) {
      expect(credentialedDashaflowSidecarConfig(
        "/v1/profile/derive",
        env("https://sidecar.example/", { VERCEL_ENV: vercelEnv }),
      )).toEqual({
        url: "https://sidecar.example/v1/profile/derive",
        token: TOKEN,
      });
    }
  });

  it.each([
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://[::1]:8000",
  ])("allows explicit HTTP loopback only for local development: %s", (url) => {
    expect(credentialedDashaflowSidecarConfig(
      "/v1/profile/derive",
      env(url),
    )).toEqual({
      url: `${url}/v1/profile/derive`,
      token: TOKEN,
    });
  });

  it.each(["preview", "production"])(
    "rejects HTTP loopback in Vercel %s before a credential can be attached",
    (vercelEnv) => {
      expect(credentialedDashaflowSidecarConfig(
        "/v1/profile/derive",
        env("http://127.0.0.1:8000", { VERCEL_ENV: vercelEnv }),
      )).toBeNull();
    },
  );

  it("rejects HTTP loopback in self-hosted production", () => {
    expect(credentialedDashaflowSidecarConfig(
      "/v1/profile/derive",
      env("http://127.0.0.1:8000", { NODE_ENV: "production" }),
    )).toBeNull();
  });

  it.each([
    "http://sidecar.example",
    "http://127.0.0.2:8000",
    "https://user:pass@sidecar.example",
    "https://sidecar.example/internal",
    "https://sidecar.example/?token=secret",
    "https://sidecar.example/#fragment",
    " https://sidecar.example",
    "not a URL",
  ])("rejects unsafe or ambiguous sidecar configuration: %s", (url) => {
    expect(credentialedDashaflowSidecarConfig(
      "/v1/election-chart/derive",
      env(url),
    )).toBeNull();
  });

  it.each([
    undefined,
    "short-token",
    ` ${TOKEN}`,
    `${TOKEN} `,
    `${TOKEN}\n`,
    "x".repeat(257),
  ])("rejects an absent, short, non-printable, or unbounded token", (token) => {
    const result = credentialedDashaflowSidecarConfig(
      "/v1/profile/derive",
      env("https://sidecar.example", { DASHAFLOW_SIDECAR_TOKEN: token }),
    );
    expect(result).toBeNull();
    expect(String(result)).not.toContain(token ?? TOKEN);
  });
});
