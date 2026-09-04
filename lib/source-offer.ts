export const SOURCE_REPOSITORY_URL =
  "https://github.com/socraticsurge/astro-unified-core";
export const LICENSE_SPDX = "AGPL-3.0-or-later";

const COMMIT_PATTERN = /^[0-9a-f]{40}$/i;

function deployedRevision(): string | null {
  for (const name of ["SOURCE_COMMIT_SHA", "VERCEL_GIT_COMMIT_SHA"] as const) {
    const value = process.env[name]?.trim() ?? "";
    if (COMMIT_PATTERN.test(value)) return value.toLowerCase();
  }
  return null;
}

export function sourceOffer() {
  const revision = deployedRevision();
  const sourceUrl = revision
    ? `${SOURCE_REPOSITORY_URL}/tree/${revision}`
    : SOURCE_REPOSITORY_URL;
  const licenseRef = revision ?? "main";

  return {
    license: {
      spdx: LICENSE_SPDX,
      url: `${SOURCE_REPOSITORY_URL}/blob/${licenseRef}/LICENSE`,
    },
    source: {
      repository: SOURCE_REPOSITORY_URL,
      revision,
      url: sourceUrl,
    },
  };
}

export function sourceOfferHeaders(): Record<string, string> {
  const offer = sourceOffer();
  return {
    Link: `<${offer.source.url}>; rel="source", <${offer.license.url}>; rel="license"`,
  };
}
