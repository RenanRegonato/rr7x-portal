import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase-server";

const BASE = "https://www.mandor.com.br";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE}/reforma-tributaria`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE}/invest-match`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE}/mapa-inteligente`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE}/auth/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE}/auth/signup`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  try {
    const supabase = createAdminClient();
    const { data: posts } = await supabase
      .from("blog_posts")
      .select("slug, updated_at")
      .eq("published", true)
      .order("published_at", { ascending: false });

    const blogRoutes: MetadataRoute.Sitemap = (posts ?? []).map((post) => ({
      url: `${BASE}/blog/${post.slug}`,
      lastModified: new Date(post.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

    return [...staticRoutes, ...blogRoutes];
  } catch {
    return staticRoutes;
  }
}
