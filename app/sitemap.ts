import type { MetadataRoute } from "next";

const PUBLIC_ROUTES = ["", "/privacy", "/terms", "/credits"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_ROUTES.map((path, index) => ({
    url: `https://astrochaganti.com${path}`,
    lastModified,
    changeFrequency: index === 0 ? "daily" : "yearly",
    priority: index === 0 ? 1 : 0.3,
  }));
}
