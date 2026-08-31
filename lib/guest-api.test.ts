import { describe, expect, it } from "vitest";
import {
  allowedGuestOrigin,
  guestClientIp,
  guestOptions,
  readLimitedJson,
} from "./guest-api";

function request(origin: string | null, init: RequestInit = {}): Request {
  const headers = new Headers(init.headers);
  if (origin !== null) headers.set("Origin", origin);
  return new Request("http://api.local/api/guest/test", { ...init, headers });
}

describe("guest API boundary", () => {
  it.each([
    "https://panchangam.astrochaganti.com",
    "http://localhost:5173",
    "http://127.0.0.1:4173",
    "http://[::1]:4173",
    "http://localhost",
  ])("allows the approved origin %s", (origin) => {
    expect(allowedGuestOrigin(request(origin))).toBe(origin);
  });

  it.each([
    null,
    "null",
    "https://panchangam.astrochaganti.com.evil.example",
    "https://localhost:5173",
    "http://127.0.0.2:5173",
    "http://[::2]:5173",
    "http://panchangam.astrochaganti.com",
  ])("rejects the unapproved origin %s", (origin) => {
    expect(allowedGuestOrigin(request(origin))).toBeNull();
  });

  it("returns a side-effect-free preflight only to allowed origins", () => {
    const allowed = guestOptions(request("https://panchangam.astrochaganti.com"));
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("Access-Control-Allow-Origin"))
      .toBe("https://panchangam.astrochaganti.com");
    expect(allowed.headers.get("Access-Control-Allow-Methods")).toBe("POST, OPTIONS");
    expect(allowed.headers.get("Access-Control-Allow-Headers")).toBe("Content-Type");
    expect(allowed.headers.get("Cache-Control")).toBe("private, no-store");

    const rejected = guestOptions(request("https://evil.example"));
    expect(rejected.status).toBe(403);
    expect(rejected.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("parses a small JSON body and rejects malformed JSON", async () => {
    const valid = request("http://localhost:5173", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ query: "Hyderabad" }),
    });
    await expect(readLimitedJson(valid)).resolves.toEqual({
      ok: true,
      value: { query: "Hyderabad" },
    });

    const malformed = request("http://localhost:5173", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    await expect(readLimitedJson(malformed)).resolves.toMatchObject({ ok: false, status: 400 });
  });

  it("enforces the 4 KiB body cap even without Content-Length", async () => {
    const oversized = request("http://localhost:5173", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(5000) }),
    });
    oversized.headers.delete("Content-Length");
    await expect(readLimitedJson(oversized)).resolves.toMatchObject({ ok: false, status: 413 });
  });

  it("rejects a declared oversized body before reading it", async () => {
    const declaredOversized = request("http://localhost:5173", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": "4097",
      },
      body: "{}",
    });
    await expect(readLimitedJson(declaredOversized)).resolves.toMatchObject({
      ok: false,
      status: 413,
    });
  });

  it("rejects non-JSON media types", async () => {
    const result = await readLimitedJson(request("http://localhost:5173", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "{}",
    }));
    expect(result).toMatchObject({ ok: false, status: 415 });
  });

  it("uses the provider-appended rightmost forwarded IP", () => {
    const req = request("http://localhost:5173", {
      headers: { "X-Forwarded-For": "spoofed, 203.0.113.8" },
    });
    expect(guestClientIp(req)).toBe("203.0.113.8");
  });
});
