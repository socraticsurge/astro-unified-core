import type { MetadataRoute } from "next";
import { getUnificationReleaseConfig } from "@/lib/unification-release";

export default function robots(): MetadataRoute.Robots {
  if (getUnificationReleaseConfig().mode === "rehearsal") {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/privacy", "/terms", "/credits"],
      disallow: [
        "/admin/",
        "/api/",
        "/compatibility/",
        "/consultation/",
        "/dashboard/",
        "/profiles/",
        "/unified",
      ],
    },
    sitemap: "https://astrochaganti.com/sitemap.xml",
  };
}
