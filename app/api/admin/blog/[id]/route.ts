import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createServerSupabaseClient } from "@/lib/supabase-server";

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

/* ── GET /api/admin/blog/[id] — get single post ── */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Artigo não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ post: data });
}

/* ── PATCH /api/admin/blog/[id] — update post ── */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const allowedFields = [
    "title",
    "content",
    "excerpt",
    "cover_image_url",
    "category",
    "tags",
    "published",
    "author_name",
    "author_avatar_url",
    "seo_title",
    "seo_description",
    "seo_keywords",
    "slug",
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field] === "" ? null : body[field];
    }
  }

  // Recalculate reading time when content changes
  if (typeof updates.content === "string") {
    updates.reading_time_minutes = estimateReadingTime(updates.content);
  }

  // Set published_at when publishing for the first time
  if (updates.published === true) {
    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from("blog_posts")
      .select("published, published_at")
      .eq("id", id)
      .single();

    if (existing && !existing.published && !existing.published_at) {
      updates.published_at = new Date().toISOString();
    }
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ post: data });
}

/* ── DELETE /api/admin/blog/[id] — delete post ── */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
