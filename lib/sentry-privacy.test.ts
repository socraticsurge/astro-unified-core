import { describe, expect, it, vi } from "vitest";

import {
  isSensitiveGeocoderUrl,
  scrubSensitiveGeocoderSpan,
  sentryServerPrivacyOptions,
} from "./sentry-privacy";

describe("Sentry geocoder privacy controls", () => {
  it.each([
    "https://eu1.locationiq.com/v1/search?q=Private+Birthplace&key=secret",
    "https://us1.locationiq.com/v1/search?q=Private+Birthplace&key=secret",
    "https://api.geoapify.com/v1/geocode/search?text=Private+Birthplace&apiKey=secret",
    "https://nominatim.openstreetmap.org/search?q=Private+Birthplace",
  ])("recognizes the exact sensitive provider endpoint: %s", (url) => {
    expect(isSensitiveGeocoderUrl(url)).toBe(true);
  });

  it.each([
    "https://api.geoapify.com/v1/other?apiKey=secret",
    "https://geoapify.example/v1/geocode/search?apiKey=secret",
    "not a URL",
  ])("does not suppress unrelated or malformed URLs: %s", (url) => {
    expect(isSensitiveGeocoderUrl(url)).toBe(false);
  });

  it("replaces the default NodeFetch integration with the privacy-filtered one", () => {
    const factory = vi.fn((options: {
      ignoreOutgoingRequests: (url: string) => boolean;
    }) => ({ name: "NodeFetch", options }));
    const httpFactory = vi.fn((options: {
      maxRequestBodySize: "none";
      ignoreOutgoingRequests: (url: string) => boolean;
    }) => ({ name: "Http", options }));
    const privacy = sentryServerPrivacyOptions(factory, httpFactory);
    const integrations = privacy.integrations([
      { name: "Http", options: {} },
      { name: "NodeFetch", options: {} },
    ]);

    expect(integrations).toHaveLength(2);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(httpFactory).toHaveBeenCalledWith(expect.objectContaining({
      maxRequestBodySize: "none",
    }));
    const predicate = factory.mock.calls[0][0].ignoreOutgoingRequests;
    expect(predicate(
      "https://api.geoapify.com/v1/geocode/search?text=Private&apiKey=secret",
    )).toBe(true);
    expect(predicate("https://example.com/public")).toBe(false);
  });

  it("removes query data from a sensitive span as defense in depth", () => {
    const original = {
      attributes: {
        "url.full": "https://eu1.locationiq.com/v1/search?q=Private&key=secret",
        "url.query": "q=Private&key=secret",
        "http.status_code": 200,
      },
    };
    expect(scrubSensitiveGeocoderSpan(original)).toEqual({
      attributes: {
        "url.full": "https://eu1.locationiq.com/v1/search",
        "url.query": "[Filtered]",
        "http.status_code": 200,
      },
    });
    expect(original.attributes["url.full"]).toContain("key=secret");
  });
});
