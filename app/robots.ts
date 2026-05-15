import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = "https://www.mandor.com.br";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/blog/", "/blog/*"],
        disallow: [
          "/auth/",
          "/dashboard/",
          "/admin/",
          "/api/",
          "/view/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
