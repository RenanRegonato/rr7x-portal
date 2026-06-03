import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createAdminClient } from "@/lib/supabase-server";

// ISR: páginas de artigo revalidam a cada 60s; slugs novos (não gerados no build)
// renderizam on-demand e passam a aparecer sem redeploy manual.
export const revalidate = 60;
export const dynamicParams = true;

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  category: string | null;
  tags: string[];
  author_name: string;
  author_avatar_url: string | null;
  published_at: string;
  updated_at: string;
  reading_time_minutes: number;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
};

async function getPost(slug: string): Promise<Post | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .single();
    if (error || !data) return null;
    return data as Post;
  } catch {
    return null;
  }
}

async function getRelated(category: string | null, currentSlug: string): Promise<Pick<Post, "slug" | "title" | "category" | "reading_time_minutes" | "published_at">[]> {
  if (!category) return [];
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("blog_posts")
      .select("slug,title,category,reading_time_minutes,published_at")
      .eq("published", true)
      .eq("category", category)
      .neq("slug", currentSlug)
      .limit(3);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function generateStaticParams() {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("blog_posts")
      .select("slug")
      .eq("published", true);
    return (data ?? []).map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Artigo não encontrado" };

  const title = post.seo_title ?? post.title;
  const description = post.seo_description ?? post.excerpt ?? "";

  return {
    title,
    description,
    keywords: post.seo_keywords ?? undefined,
    openGraph: {
      title,
      description,
      type: "article",
      url: `/blog/${slug}`,
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
      authors: [post.author_name],
      tags: post.tags,
      images: post.cover_image_url
        ? [{ url: post.cover_image_url, alt: post.title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: post.cover_image_url ? [post.cover_image_url] : undefined,
    },
    alternates: { canonical: `/blog/${slug}` },
  };
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [post, related] = await Promise.all([
    getPost(slug),
    getPost(slug).then((p) => (p ? getRelated(p.category, slug) : [])),
  ]);

  if (!post) notFound();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.cover_image_url,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      "@type": "Person",
      name: post.author_name,
    },
    publisher: {
      "@type": "Organization",
      name: "Mandor",
      url: "https://www.mandor.com.br",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://www.mandor.com.br/blog/${slug}`,
    },
  };

  return (
    <div className="bg-lp-canvas text-lp-ink font-sans antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* Navbar */}
      <header
        className="sticky top-0 z-50 border-b border-lp-border"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)" }}
      >
        <nav className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src="/logo/mandor-horizontal.svg" alt="Mandor" className="h-7 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/blog" className="text-[13px] text-lp-ink-2 hover:text-lp-ink transition-colors">← Blog</Link>
            <Link href="/auth/signup" className="text-[13px] font-medium text-white px-4 py-2 rounded-[9px] hover:opacity-90" style={{ background: "#8C6F45" }}>
              Começar grátis
            </Link>
          </div>
        </nav>
      </header>

      {/* Breadcrumb */}
      <div className="max-w-[800px] mx-auto px-6 pt-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-lp-ink-3">
          <Link href="/" className="hover:text-lp-ink transition-colors">Home</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-lp-ink transition-colors">Blog</Link>
          {post.category && (
            <>
              <span>/</span>
              <Link href={`/blog?categoria=${encodeURIComponent(post.category)}`} className="hover:text-lp-ink transition-colors">
                {post.category}
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* Article header */}
      <header className="max-w-[800px] mx-auto px-6 pt-8 pb-8">
        <div className="flex items-center gap-3 mb-5">
          {post.category && (
            <Link
              href={`/blog?categoria=${encodeURIComponent(post.category)}`}
              className="text-[11px] font-medium text-lp-accent bg-lp-accent-soft px-2.5 py-1 rounded-full hover:bg-lp-mist transition-colors"
            >
              {post.category}
            </Link>
          )}
          <span className="text-[12px] text-lp-ink-3">
            {post.reading_time_minutes} min de leitura
          </span>
        </div>

        <h1 className="font-display text-[36px] sm:text-[48px] leading-[1.1] tracking-tight text-lp-ink mb-5">
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="text-[16px] text-lp-ink-2 leading-relaxed mb-6">
            {post.excerpt}
          </p>
        )}

        <div className="flex items-center gap-3 pb-6 border-b border-lp-border">
          {post.author_avatar_url ? (
            <img
              src={post.author_avatar_url}
              alt={post.author_name}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-lp-accent-soft flex items-center justify-center text-[12px] font-medium text-lp-accent">
              {post.author_name.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-[13px] font-medium text-lp-ink">{post.author_name}</p>
            <time dateTime={post.published_at} className="text-[11.5px] text-lp-ink-3">
              {formatDate(post.published_at)}
            </time>
          </div>
        </div>
      </header>

      {/* Cover image */}
      {post.cover_image_url && (
        <div className="max-w-[1000px] mx-auto px-6 mb-10">
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full rounded-[16px] object-cover"
            style={{ maxHeight: 480 }}
          />
        </div>
      )}

      {/* Article content */}
      <article className="max-w-[720px] mx-auto px-6 pb-16">
        <div className="prose prose-lg max-w-none lp-prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.content}
          </ReactMarkdown>
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-10 pt-8 border-t border-lp-border">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11.5px] text-lp-ink-2 bg-lp-fog border border-lp-border px-2.5 py-1 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </article>

      {/* CTA */}
      <section className="lp-dark-section">
        <div className="max-w-[720px] mx-auto px-6 py-14 text-center">
          <h2 className="font-display text-[28px] sm:text-[36px] leading-[1.1] tracking-tight mb-4" style={{ color: "#EDE9E5" }}>
            Pronto para diagnosticar
            <br />
            <em style={{ fontStyle: "italic", color: "#93B4F8" }}>seu próximo deal?</em>
          </h2>
          <p className="text-[14px] mb-7" style={{ color: "#B5B0A6" }}>
            Primeira análise gratuita. 10 especialistas em IA em paralelo. Resultado em até 90 minutos.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 text-[13.5px] font-medium text-white px-6 py-3 rounded-[10px] hover:opacity-90"
            style={{ background: "#8C6F45" }}
          >
            Começar agora <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* Related posts */}
      {related.length > 0 && (
        <section className="max-w-[1280px] mx-auto px-6 py-14">
          <h2 className="font-display text-[24px] text-lp-ink mb-7">Artigos relacionados</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {related.map((r) => (
              <Link key={r.slug} href={`/blog/${r.slug}`} className="group">
                <article className="rounded-[16px] p-5 border border-lp-border bg-lp-canvas hover:border-lp-border-strong transition-colors lp-card-shadow-sm">
                  {r.category && (
                    <span className="text-[10.5px] font-medium text-lp-accent bg-lp-accent-soft px-2 py-0.5 rounded-full mb-3 inline-block">
                      {r.category}
                    </span>
                  )}
                  <h3 className="text-[14px] font-semibold text-lp-ink group-hover:text-lp-accent transition-colors line-clamp-2">
                    {r.title}
                  </h3>
                  <p className="text-[11.5px] text-lp-ink-3 mt-2">
                    {r.reading_time_minutes} min · {formatDate(r.published_at)}
                  </p>
                </article>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-lp-border">
        <div className="max-w-[1280px] mx-auto px-6 py-8 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src="/logo/mandor-horizontal.svg" alt="Mandor" className="h-6 w-auto" />
          </Link>
          <p className="text-[12px] text-lp-ink-3">© {new Date().getFullYear()} RR7x Capital Hub</p>
        </div>
      </footer>
    </div>
  );
}
