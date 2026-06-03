# Deployment Checklist — Reforma Tributária 2025 Blog Post

**Status:** Ready for deployment  
**Date Created:** 2026-06-03  
**Article Slug:** `reforma-tributaria-2025-guia-completo-adequacao-fiscal`

---

## 📋 Pre-Deployment Verification

### Content Files ✅
- [x] Article markdown: `docs/blog-articles/reforma-tributaria-2025-guia-completo.md` (2,847 words)
- [x] Cover image: `public/blog-covers/reforma-tributaria-2025-cover.png` (1200x630px, 11KB)
- [x] Publishing guide: `docs/blog-articles/PUBLISHING-GUIDE.md`
- [x] Social media templates: `docs/blog-articles/SOCIAL-MEDIA-TEMPLATES.md`
- [x] Deployment checklist: `docs/blog-articles/DEPLOYMENT-CHECKLIST.md` (this file)

### Quality Checks ✅
- [x] SEO keywords integrated (reforma tributária, enquadramento tributário, planejamento tributário, adequação fiscal)
- [x] 3 case studies with quantified savings (R$ 2M–R$ 6M)
- [x] Actionable checklist (4-phase implementation)
- [x] Clear CTA directing to Mandor
- [x] Reading time calculated: 12 minutes
- [x] Word count: 2,847 words (1,500–2,500 target range: ✅ Exceeded for depth)

---

## 🚀 Day 1: Content Insertion & Validation

### Step 1: Upload Cover Image to Supabase Storage (5 min)

```bash
# Cover image is already in public/blog-covers/
# When deploying to Vercel, this will be served via CDN
# For manual upload to Supabase bucket:

# 1. Go to Supabase Dashboard > Storage > blog bucket
# 2. Upload: public/blog-covers/reforma-tributaria-2025-cover.png
# 3. Make public (if not default)
# 4. Copy public URL (should be ~https://[project].supabase.co/storage/v1/object/public/blog/...)
# 5. Note the URL for SQL insert below
```

### Step 2: Insert Post into Supabase (5 min)

**Option A: Via Supabase Dashboard SQL Editor**

```sql
INSERT INTO blog_posts (
  id,
  slug,
  title,
  excerpt,
  content,
  cover_image_url,
  category,
  author_name,
  author_slug,
  reading_time_minutes,
  tags,
  published,
  published_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'reforma-tributaria-2025-guia-completo-adequacao-fiscal',
  'Reforma Tributária 2025: Guia Completo de Adequação Fiscal para Empresas',
  'A Reforma Tributária oferece oportunidade de reduzir carga fiscal em 5–20%. Guia completo sobre enquadramento tributário, planejamento fiscal e adequação para empresas.',
  '[PASTE FULL MARKDOWN CONTENT FROM docs/blog-articles/reforma-tributaria-2025-guia-completo.md]',
  'https://[your-supabase-project].supabase.co/storage/v1/object/public/blog/reforma-tributaria-2025-cover.png',
  'Reforma Tributária',
  'Mandor',
  'mandor',
  12,
  ARRAY['reforma-tributaria', 'enquadramento-tributario', 'planejamento-tributario', 'ibs', 'cbs', 'adequacao-fiscal', 'lucro-real', 'icms'],
  true,
  NOW(),
  NOW(),
  NOW()
);
```

**Option B: Via Node.js Script (if available)**

```bash
npm run seed:blog-post -- \
  --slug "reforma-tributaria-2025-guia-completo-adequacao-fiscal" \
  --title "Reforma Tributária 2025: Guia Completo de Adequação Fiscal para Empresas" \
  --excerpt "A Reforma Tributária oferece oportunidade de reduzir carga fiscal em 5–20%." \
  --content-file docs/blog-articles/reforma-tributaria-2025-guia-completo.md \
  --cover-url "https://[your-supabase].supabase.co/storage/v1/object/public/blog/reforma-tributaria-2025-cover.png" \
  --category "Reforma Tributária" \
  --author "Mandor" \
  --reading-time 12 \
  --tags "reforma-tributaria,enquadramento-tributario,planejamento-tributario,ibs,cbs,adequacao-fiscal,lucro-real,icms" \
  --publish
```

### Step 3: Validate Rendering (10 min)

1. **Check blog listing:**
   ```
   https://www.mandor.com.br/blog
   ```
   - [ ] Article appears in the list
   - [ ] Cover image loads correctly
   - [ ] Title and excerpt are visible
   - [ ] Date is correct (2026-06-03)

2. **Check individual article page:**
   ```
   https://www.mandor.com.br/blog/reforma-tributaria-2025-guia-completo-adequacao-fiscal
   ```
   - [ ] Cover image displays at top
   - [ ] Title renders correctly
   - [ ] Metadata (author, date, reading time, category) display
   - [ ] Content renders in markdown properly:
     - [ ] H2 headings styled correctly
     - [ ] Bullets and lists formatted
     - [ ] Code blocks visible (if any)
     - [ ] Emphasis (bold/italic) works
   - [ ] CTA at end is visible and clickable
   - [ ] No broken links to www.mandor.com.br

3. **Check Open Graph metadata (SEO):**
   ```bash
   # Right-click article page > Inspect > Head
   # Verify:
   # - og:title = article title
   # - og:description = excerpt
   # - og:image = cover image URL
   # - og:url = full article URL
   # - canonical = self-referential URL
   ```

---

## 📱 Day 2: Social Media Distribution

### LinkedIn (3 Posts)

**Post 1 — Problem-Agitate-Solve (Day 2, 9:00 AM)**
- [ ] Copy from `SOCIAL-MEDIA-TEMPLATES.md` > LinkedIn > Post 1
- [ ] Add article link
- [ ] Add 5–10 relevant contacts to notify (CFOs, controllers, tax consultants)
- [ ] Schedule/publish
- [ ] Monitor comments for 24h (respond to top 3 comments)

**Post 2 — Educational (Day 4, 10:00 AM)**
- [ ] Copy from `SOCIAL-MEDIA-TEMPLATES.md` > LinkedIn > Post 2
- [ ] Add article link
- [ ] Cross-promote with CEO/founder quote if available
- [ ] Schedule/publish

**Post 3 — Case Study (Day 7, 10:00 AM)**
- [ ] Copy from `SOCIAL-MEDIA-TEMPLATES.md` > LinkedIn > Post 3
- [ ] Embed chart/image showing savings breakdown (R$ 6M)
- [ ] Schedule/publish

### Twitter/X (3 Tweets)

**Tweet 1 — Urgency (Day 2, 2:00 PM)**
- [ ] Copy from `SOCIAL-MEDIA-TEMPLATES.md` > Twitter > Tweet 1
- [ ] Use shortlink (bit.ly or Mandor's link shortener)
- [ ] Add 3–5 relevant hashtags
- [ ] Tweet

**Tweet 2 — Data (Day 5, 10:00 AM)**
- [ ] Copy from `SOCIAL-MEDIA-TEMPLATES.md` > Twitter > Tweet 2
- [ ] Tweet

**Tweet 3 — Engagement (Day 9, 2:00 PM)**
- [ ] Copy from `SOCIAL-MEDIA-TEMPLATES.md` > Twitter > Tweet 3
- [ ] Create poll or retweet from relevant account
- [ ] Tweet

### Email Newsletter

**Email 1 — Main Newsletter (Day 3)**
- [ ] From: `contato@mandor.com.br` or `team@mandor.com.br`
- [ ] Subject line: Use A/B test option 1 or 2 from `SOCIAL-MEDIA-TEMPLATES.md`
- [ ] Body: Copy from `SOCIAL-MEDIA-TEMPLATES.md` > Email Body
- [ ] Add article link (full URL, not shortlink)
- [ ] Add CTA button: "Leia o Artigo Completo" → article URL
- [ ] Target: All customers + newsletter subscribers
- [ ] Send time: Tuesday 10:00 AM (good open rates)
- [ ] Verify: Test email first, check rendering in Outlook/Gmail

**Email 2 — Follow-up (Day 10, if engagement >25%)**
- [ ] Shorter message highlighting key case studies
- [ ] Target: Unopeners from Email 1
- [ ] CTA: "Receba diagnóstico gratuito de adequação fiscal"

---

## 🔍 Google Search Console & SEO Setup (Day 3–4)

### Search Console

- [ ] Login to [Google Search Console](https://search.google.com/search-console)
- [ ] Verify property: `www.mandor.com.br`
- [ ] Submit URL manually:
  ```
  https://www.mandor.com.br/blog/reforma-tributaria-2025-guia-completo-adequacao-fiscal
  ```
- [ ] Check "Inspect URL" tool:
  - [ ] URL is indexable
  - [ ] Mobile usability: Good
  - [ ] Screenshot shows correct cover image

### Structured Data (Schema)

- [ ] Verify article has schema.org/BlogPosting markup:
  ```json
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "Reforma Tributária 2025: Guia Completo...",
    "description": "A Reforma Tributária oferece...",
    "image": "https://[cover-image-url]",
    "datePublished": "2026-06-03",
    "author": { "@type": "Organization", "name": "Mandor" }
  }
  ```
- [ ] Test with [Google Structured Data Tool](https://search.google.com/test/rich-results)

### SEO Keywords Monitoring Setup

- [ ] Add to tracking tool (Ahrefs, SEMrush, or Google Sheets):
  - reforma tributária
  - enquadramento tributário
  - planejamento tributário
  - adequação fiscal
  - IBS
  - CBS
  - ICMS
  - Lucro Real

- [ ] Baseline (Day 1): Note current ranking position for each keyword
- [ ] Monitor weekly for 4 weeks
- [ ] Target: Top 10 position by week 4

---

## 📊 Analytics Setup (Day 4)

### Google Analytics 4

- [ ] Ensure blog page is tracked:
  ```bash
  # Verify GA4 tag on www.mandor.com.br/blog/*
  # Check: Settings > Data Streams > Web > Measurement ID
  ```

- [ ] Create custom event for blog CTA clicks:
  ```javascript
  // Add to CTA button onclick:
  gtag('event', 'blog_cta_click', {
    page_title: 'Reforma Tributária 2025',
    button_text: 'Agende uma conversa'
  });
  ```

- [ ] Create dashboard/report:
  - Sessions (blog page)
  - Users (new vs. returning)
  - Bounce rate
  - Average engagement time
  - Conversions (CTA clicks)

### Baseline Metrics (Day 1)

Record these for comparison after 2 weeks:
- [ ] Daily sessions: _____
- [ ] Bounce rate: _____
- [ ] Avg engagement time: _____ minutes
- [ ] CTA conversion rate: _____

---

## 🔗 Backlink & PR Strategy (Week 2–4)

### Outreach (Priority: Medium)

- [ ] Identify 10–15 relevant blogs/sites (tax/accounting/finance in PT-BR):
  - [ ] Tax accounting blogs
  - [ ] Financial advisor sites
  - [ ] Consulting firm blogs
  - [ ] Business publications

- [ ] Send outreach email template:
  ```
  Subject: Link request - Artigo sobre Reforma Tributária 2025
  
  Olá [editor/publisher],
  
  Escrevemos um guia completo sobre Reforma Tributária com cases reais 
  de economia (R$ 2M–R$ 6M/ano) que pode interessar seus leitores.
  
  Seria possível incluir um link em seu artigo sobre reforma fiscal?
  
  Link: https://www.mandor.com.br/blog/reforma-tributaria-2025-guia-completo-adequacao-fiscal
  
  Att,
  Renan Regonato
  Mandor
  ```

- [ ] Follow up with top 5 non-respondents after 2 weeks

---

## 📈 Week 2–4: Monitor & Optimize

### Daily (Week 1 only)

- [ ] Check article comments (moderate if needed)
- [ ] Monitor social media engagement (like/comment on relevant responses)
- [ ] Check Google Search Console for errors

### Weekly (Weeks 2–4)

- [ ] Google Analytics: Check traffic, bounce rate, conversion rate
- [ ] SEO Tools: Check keyword positions
- [ ] Social media: Compile engagement metrics
  - [ ] LinkedIn: Impressions, engagements, shares
  - [ ] Twitter: Impressions, retweets, CTR
  - [ ] Email: Open rate, click rate

### Optimization Triggers

If any metric underperforms, optimize:

**Low social engagement (<50 LinkedIn engagements):**
- Reshare post with different angle
- Update with recent data/examples
- Ask question in caption for replies

**Low blog traffic (<100 sessions/day):**
- Check: Is article indexed? (Google Search Console)
- Check: Is it ranking? (SEO tool)
- Increase paid promotion (LinkedIn/Google Ads)

**High bounce rate (>60%):**
- Check: Content renders correctly?
- Check: Cover image loads?
- Verify: No broken links
- Optimize: First 100 words (critical for engagement)

**Low CTA conversion (<1%):**
- Test: Different CTA text
- Test: CTA button color (maybe not matching brand?)
- Move CTA higher in article (test at 50% scroll)

---

## 🎯 Success Metrics (Target by Week 4)

| Metric | Target | Status |
|--------|--------|--------|
| **Blog Sessions** | 300+ | _____ |
| **Social Engagement** | 500+ total | _____ |
| **CTA Conversion Rate** | >1.5% | _____ |
| **Bounce Rate** | <50% | _____ |
| **Avg. Session Duration** | >4 min | _____ |
| **Keyword Position** | Top 10 (≥50% of keywords) | _____ |
| **Email Open Rate** | >30% | _____ |
| **Email CTR** | >5% | _____ |

---

## 📝 Post-Deployment Documentation

- [ ] Update `MEMORY.md` with:
  - Article published date
  - URL
  - Performance metrics (after 4 weeks)
  - Key learnings

- [ ] Archive this checklist with completion dates

---

## ⚠️ Rollback Plan (if needed)

If article needs to be unpublished:

```bash
# Unpublish in Supabase:
UPDATE blog_posts 
SET published = false 
WHERE slug = 'reforma-tributaria-2025-guia-completo-adequacao-fiscal';

# Revert social media:
- [ ] Delete LinkedIn posts
- [ ] Delete Twitter tweets
- [ ] Unsend email (if within 30 min)
- [ ] Remove from Google Search Console (request removal)
```

---

## 🚀 Ready to Deploy?

All prerequisites met:
- [x] Article content (2,847 words, SEO-optimized)
- [x] Cover image (1200x630px PNG)
- [x] Publishing guide
- [x] Social media templates (10+ posts)
- [x] Email marketing templates
- [x] Deployment checklist (this file)

**Next step:** Insert into Supabase database (see Step 2 above).

**Estimated total deployment time:** 2–3 hours (content insertion + validation + social distribution)
