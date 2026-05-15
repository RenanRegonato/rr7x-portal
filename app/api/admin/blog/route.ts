import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createServerSupabaseClient } from "@/lib/supabase-server";
import { createClient as createBrowserClient } from "@/lib/supabase";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

async function requireAdmin(req: NextRequest): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const adminEmails = (process.env.ADMIN_EMAILS ?? "gestor@renanregonato.com.br")
    .split(",")
    .map((e) => e.trim());

  return adminEmails.includes(user.email ?? "");
}

/* ── GET /api/admin/blog — list all posts (admin) ── */
export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const published = searchParams.get("published");
  const from = (page - 1) * limit;

  const supabase = createAdminClient();
  let query = supabase
    .from("blog_posts")
    .select(
      "id,slug,title,excerpt,category,published,published_at,reading_time_minutes,created_at,updated_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (published !== null) {
    query = query.eq("published", published === "true");
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ posts: data, total: count, page, limit });
}

/* ── POST /api/admin/blog — create post ── */
export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const {
    title,
    content,
    excerpt,
    cover_image_url,
    category,
    tags,
    published,
    author_name,
    author_avatar_url,
    seo_title,
    seo_description,
    seo_keywords,
    custom_slug,
  } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });
  }
  if (!content?.trim()) {
    return NextResponse.json({ error: "Conteúdo é obrigatório" }, { status: 400 });
  }

  const baseSlug = custom_slug?.trim() ? slugify(custom_slug) : slugify(title);
  const supabase = createAdminClient();

  // Ensure slug uniqueness
  let slug = baseSlug;
  let attempt = 0;
  while (attempt < 10) {
    const { data: existing } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      slug,
      title: title.trim(),
      content: content.trim(),
      excerpt: excerpt?.trim() || null,
      cover_image_url: cover_image_url?.trim() || null,
      category: category?.trim() || null,
      tags: Array.isArray(tags) ? tags : [],
      published: published === true,
      published_at: published === true ? now : null,
      author_name: author_name?.trim() || "Equipe Mandor",
      author_avatar_url: author_avatar_url?.trim() || null,
      reading_time_minutes: estimateReadingTime(content),
      seo_title: seo_title?.trim() || null,
      seo_description: seo_description?.trim() || null,
      seo_keywords: seo_keywords?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ post: data }, { status: 201 });
}
