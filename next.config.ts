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
