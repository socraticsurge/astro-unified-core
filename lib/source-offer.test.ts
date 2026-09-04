import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  LICENSE_SPDX,
  SOURCE_REPOSITORY_URL,
  sourceOffer,
  sourceOfferHeaders,
} from "./source-offer";

const REVISION = "a".repeat(40);
const ORIGINAL_SOURCE_COMMIT_SHA = process.env.SOURCE_COMMIT_SHA;
const ORIGINAL_VERCEL_GIT_COMMIT_SHA = process.env.VERCEL_GIT_COMMIT_SHA;

function restore(name: "SOURCE_COMMIT_SHA" | "VERCEL_GIT_COMMIT_SHA", value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

describe("AGPL source offer", () => {
  beforeEach(() => {
    delete process.env.SOURCE_COMMIT_SHA;
    delete process.env.VERCEL_GIT_COMMIT_SHA;
  });

  afterAll(() => {
    restore("SOURCE_COMMIT_SHA", ORIGINAL_SOURCE_COMMIT_SHA);
    restore("VERCEL_GIT_COMMIT_SHA", ORIGINAL_VERCEL_GIT_COMMIT_SHA);
  });

  it("offers the repository and default-branch license without a revision", () => {
    expect(sourceOffer()).toEqual({
      license: {
        spdx: LICENSE_SPDX,
        url: `${SOURCE_REPOSITORY_URL}/blob/main/LICENSE`,
      },
      source: {
        repository: SOURCE_REPOSITORY_URL,
        revision: null,
        url: SOURCE_REPOSITORY_URL,
      },
    });
  });

  it("pins source and license links to the deployed revision", () => {
    process.env.VERCEL_GIT_COMMIT_SHA = REVISION.toUpperCase();

    const offer = sourceOffer();
    expect(offer.source.revision).toBe(REVISION);
    expect(offer.source.url).toBe(`${SOURCE_REPOSITORY_URL}/tree/${REVISION}`);
    expect(offer.license.url).toBe(
      `${SOURCE_REPOSITORY_URL}/blob/${REVISION}/LICENSE`,
    );
    expect(sourceOfferHeaders().Link).toContain('rel="source"');
    expect(sourceOfferHeaders().Link).toContain('rel="license"');
  });

  it("never incorporates an untrusted revision into a public URL", () => {
    process.env.SOURCE_COMMIT_SHA = "../private";
    process.env.VERCEL_GIT_COMMIT_SHA = "not-a-commit";

    expect(sourceOffer().source).toEqual({
      repository: SOURCE_REPOSITORY_URL,
      revision: null,
      url: SOURCE_REPOSITORY_URL,
    });
  });
});
