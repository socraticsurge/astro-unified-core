import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { deploymentEnvironment } from "./deployment-environment";

describe("deploymentEnvironment", () => {
  it.each([
    { NODE_ENV: "development" },
    { NODE_ENV: "test" },
    { NODE_ENV: "development", VERCEL_ENV: "development" },
    { NODE_ENV: "test", VERCEL_ENV: "development" },
  ])("recognizes an explicit local runtime: %j", (env) => {
    expect(deploymentEnvironment(env)).toBe("local");
  });

  it.each([
    { NODE_ENV: "production", VERCEL_ENV: "preview" },
    { NODE_ENV: "production", VERCEL_ENV: "production" },
    { VERCEL_ENV: "preview" },
    { VERCEL_ENV: "production" },
  ])("recognizes a deployed runtime: %j", (env) => {
    expect(deploymentEnvironment(env)).toBe("deployed");
  });

  it.each([
    {},
    { VERCEL: "1" },
    { NODE_ENV: "production" },
    { VERCEL_ENV: "staging" },
    { NODE_ENV: "production", VERCEL_ENV: "development" },
    { NODE_ENV: "development", VERCEL_ENV: "preview" },
    { NODE_ENV: "test", VERCEL_ENV: "production" },
    { NODE_ENV: "unexpected" },
  ])("fails closed for ambiguous or contradictory markers: %j", (env) => {
    expect(deploymentEnvironment(env)).toBe("unknown");
  });
});
