import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't try to bundle these — keep as node_modules imports.
  // geo-tz reads .dat files at runtime; bundling breaks fs.readFile lookups.
  serverExternalPackages: [
    "better-sqlite3",
    "@fusionstrings/panchangam",
    "geo-tz",
  ],
  // Force-include geo-tz's data files in the function bundle.
  // Without this, Vercel's file tracer doesn't see them and they get
  // dropped, causing ENOENT for the 1970 timezones file.
  outputFileTracingIncludes: {
    "/api/profiles": [
      "./node_modules/geo-tz/data/timezones-1970.geojson.*",
    ],
    "/api/profiles/[id]": [
      "./node_modules/geo-tz/data/timezones-1970.geojson.*",
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; media-src 'self';",
          },
        ],
      },
    ];
  },
  // Redirect anyone with /v2 bookmarks to the now-default profile view.
  async redirects() {
    return [
      {
        source: "/profiles/:id/v2",
        destination: "/profiles/:id",
        permanent: true,
      },
    ];
  },
  turbopack: {},
  webpack: (config) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    return config;
  },
};

export default nextConfig;
