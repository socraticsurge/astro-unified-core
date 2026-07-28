import { describe, expect, it } from "vitest";
import { isPublicPath } from "./proxy";

describe("public proxy paths", () => {
  it.each([
    "/",
    "/robots.txt",
    "/sitemap.xml",
    "/icon.svg",
    "/images/vinay-chaganti-portrait.webp",
    "/images/editorial/future-profile.webp",
  ])("allows %s without authentication", (pathname) => {
    expect(isPublicPath(pathname)).toBe(true);
  });

  it.each([
    "/dashboard",
    "/profiles/abc",
    "/admin",
    "/consultation",
    "/image-private/file.webp",
  ])("keeps %s behind authentication", (pathname) => {
    expect(isPublicPath(pathname)).toBe(false);
  });
});
