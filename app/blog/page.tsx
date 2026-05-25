import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase-server";

// ISR: regenera a listagem a cada 60s para que posts novos apareçam sem redeploy.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Blog — M&A, Crédito e Deal Intelligence",
  description:
    "Artigos e insights sobre M&A, crédito estruturado, valuation, deal readiness e inteligência de deals para assessores e gestores de capital.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog Mandor — M&A, Crédito e Deal Intelligence",
    description:
      "Insights sobre M&A, crédito estruturado, valuation e deal intelligence.",
    url: "/blog",
    type: "website",
  },
};

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: string | null;
  author_name: string;
  published_at: string;
  reading_time_minutes: number;
  tags: string[];
};

async function getPosts(category?: string): Promise<Post[]> {
  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("blog_posts")
      .select(
        "id,slug,title,excerpt,cover_image_url,category,author_name,published_at,reading_time_minutes,tags"
      )
      .eq("published", true)
      .order("published_at", { ascending: false });

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

async function getCategories(): Promise<string[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("blog_posts")
      .select("category")
      .eq("published", true)
      .not("category", "is", null);

    const cats = [...new Set((data ?? []).map((r) => r.category).filter(Boolean))];
    return cats as string[];
  } catch {
    return [];
  }
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria } = await searchParams;
  const [posts, categories] = await Promise.all([
    getPosts(categoria),
    getCategories(),
  ]);

  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <div className="bg-lp-canvas text-lp-ink font-sans antialiased min-h-screen">
      {/* Navbar */}
      <header
        className="sticky top-0 z-50 border-b border-lp-border"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)" }}
      >
        <nav className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src="/logo/mandor-horizontal.svg" alt="Mandor" className="h-7 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="hidden sm:block text-[13px] text-lp-ink-2 hover:text-lp-ink px-4 py-2 transition-colors">
              Entrar
            </Link>
            <Link href="/auth/signup" className="text-[13px] font-medium text-white px-4 py-2 rounded-[9px] hover:opacity-90" style={{ background: "#1655E8" }}>
              Começar grátis
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="border-b border-lp-border bg-lp-fog">
        <div className="max-w-[1280px] mx-auto px-6 py-14 lg:py-20">
          <p className="text-[11.5px] font-medium text-lp-accent uppercase tracking-widest mb-4">Blog</p>
          <h1 className="font-display text-[40px] sm:text-[52px] leading-[1.1] tracking-tight text-lp-ink mb-4">
            Inteligência para
            <br />
            <em style={{ fontStyle: "italic" }}>cada deal.</em>
          </h1>
          <p className="text-[15.5px] text-lp-ink-2 max-w-[520px] leading-relaxed">
            Artigos sobre M&amp;A, crédito estruturado, valuation e deal readiness para
            assessores e gestores de capital.
          </p>
        </div>
      </section>

      <div className="max-w-[1280px] mx-auto px-6 py-12 lg:py-16">
        {/* Category filter */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-10">
            <Link
              href="/blog"
              className={`text-[12.5px] font-medium px-3.5 py-1.5 rounded-full border transition-colors ${
                !categoria
                  ? "border-lp-accent text-white"
                  : "border-lp-border text-lp-ink-2 hover:border-lp-border-strong"
              }`}
              style={!categoria ? { background: "#1655E8" } : {}}
            >
              Todos
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat}
                href={`/blog?categoria=${encodeURIComponent(cat)}`}
                className={`text-[12.5px] font-medium px-3.5 py-1.5 rounded-full border transition-colors ${
                  categoria === cat
                    ? "border-lp-accent text-white"
                    : "border-lp-border text-lp-ink-2 hover:border-lp-border-strong"
                }`}
                style={categoria === cat ? { background: "#1655E8" } : {}}
              >
                {cat}
              </Link>
            ))}
          </div>
        )}

        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[15px] text-lp-ink-3">Nenhum artigo publicado ainda.</p>
          </div>
        ) : (
          <>
            {/* Featured post */}
            {featured && !categoria && (
              <Link href={`/blog/${featured.slug}`} className="group block mb-10">
                <article className="grid lg:grid-cols-2 gap-0 rounded-[20px] overflow-hidden border border-lp-border lp-card-shadow-sm hover:border-lp-border-strong transition-colors">
                  {/* Image */}
                  <div
                    className="aspect-[16/9] lg:aspect-auto bg-lp-fog flex items-center justify-center"
                    style={{ minHeight: 260 }}
                  >
                    {featured.cover_image_url ? (
                      <img
                        src={featured.cover_image_url}
                        alt={featured.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-lp-mist to-lp-fog flex items-center justify-center">
                        <span className="text-[40px] opacity-20">◈</span>
                      </div>
                    )}
                  </div>
                  {/* Content */}
                  <div className="p-8 lg:p-10 flex flex-col justify-center bg-lp-canvas">
                    <div className="flex items-center gap-3 mb-4">
                      {featured.category && (
                        <span className="text-[11px] font-medium text-lp-accent bg-lp-accent-soft px-2.5 py-1 rounded-full">
                          {featured.category}
                        </span>
                      )}
                      <span className="text-[11.5px] text-lp-ink-3">
                        {featured.reading_time_minutes} min de leitura
                      </span>
                    </div>
                    <h2 className="font-display text-[26px] sm:text-[30px] leading-[1.2] tracking-tight text-lp-ink mb-3 group-hover:text-lp-accent transition-colors">
                      {featured.title}
                    </h2>
                    {featured.excerpt && (
                      <p className="text-[14px] text-lp-ink-2 leading-relaxed mb-5 line-clamp-3">
                        {featured.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-[12px] text-lp-ink-3">
                      <span>{featured.author_name}</span>
                      <span>·</span>
                      <time dateTime={featured.published_at}>
                        {formatDate(featured.published_at)}
                      </time>
                    </div>
                  </div>
                </article>
              </Link>
            )}

            {/* Posts grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {(categoria ? posts : rest).map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="group">
                  <article className="h-full rounded-[18px] overflow-hidden border border-lp-border bg-lp-canvas lp-card-shadow-sm hover:border-lp-border-strong transition-colors flex flex-col">
                    {/* Cover */}
                    <div className="aspect-[16/9] bg-lp-fog overflow-hidden">
                      {post.cover_image_url ? (
                        <img
                          src={post.cover_image_url}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-lp-mist to-lp-fog flex items-center justify-center">
                          <span className="text-[28px] opacity-20">◈</span>
                        </div>
                      )}
                    </div>
                    {/* Body */}
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        {post.category && (
                          <span className="text-[10.5px] font-medium text-lp-accent bg-lp-accent-soft px-2 py-0.5 rounded-full">
                            {post.category}
                          </span>
                        )}
                        <span className="text-[11px] text-lp-ink-3">
                          {post.reading_time_minutes} min
                        </span>
                      </div>
                      <h2 className="font-semibold text-[15px] text-lp-ink leading-snug mb-2 group-hover:text-lp-accent transition-colors line-clamp-2">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="text-[12.5px] text-lp-ink-3 leading-relaxed line-clamp-3 mb-4 flex-1">
                          {post.excerpt}
                        </p>
                      )}
                      <p className="text-[11.5px] text-lp-ink-3 mt-auto">
                        <time dateTime={post.published_at}>
                          {formatDate(post.published_at)}
                        </time>
                      </p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer mínimo */}
      <footer className="border-t border-lp-border mt-8">
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
