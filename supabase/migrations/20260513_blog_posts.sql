-- Blog posts table for Otto by RR7x content strategy
CREATE TABLE IF NOT EXISTS blog_posts (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  text        UNIQUE NOT NULL,
  title                 text        NOT NULL,
  excerpt               text,
  content               text        NOT NULL DEFAULT '',
  cover_image_url       text,
  author_name           text        NOT NULL DEFAULT 'Equipe Otto by RR7x',
  author_avatar_url     text,
  category              text,
  tags                  text[]      NOT NULL DEFAULT '{}',
  published             boolean     NOT NULL DEFAULT false,
  published_at          timestamptz,
  reading_time_minutes  integer     NOT NULL DEFAULT 5,
  -- SEO fields
  seo_title             text,
  seo_description       text,
  seo_keywords          text,
  -- Timestamps
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Index for fast slug lookup (used on every blog post page load)
CREATE INDEX IF NOT EXISTS blog_posts_slug_idx      ON blog_posts (slug);
-- Index for listing published posts ordered by date
CREATE INDEX IF NOT EXISTS blog_posts_published_idx ON blog_posts (published, published_at DESC);
-- Index for category filtering
CREATE INDEX IF NOT EXISTS blog_posts_category_idx  ON blog_posts (category) WHERE published = true;

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Row Level Security
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read published posts (public blog)
CREATE POLICY "public_read_published_posts"
  ON blog_posts FOR SELECT
  USING (published = true);

-- Service role bypasses RLS — admin API uses service role key
-- No additional policies needed for admin writes
