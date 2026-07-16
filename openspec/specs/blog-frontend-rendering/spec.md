# blog-frontend-rendering Specification

## Purpose

URL conventions, query patterns, components, styling, and revalidation for rendering the blog on client frontends (Astro and Next.js starters). All components use Vanilla CSS, CSS Modules, or SCSS — no Tailwind.

## Requirements

### Requirement: Blog URL Routes

Both starters MUST expose:

| Route | Astro path | Next.js path |
|-------|------------|--------------|
| Blog index (latest 10) | `src/pages/blog/index.astro` | `src/app/blog/page.tsx` |
| Post detail | `src/pages/blog/post/[slug].astro` | `src/app/blog/post/[slug]/page.tsx` |
| Category filter | `src/pages/blog/category/[slug]/index.astro` | `src/app/blog/category/[slug]/page.tsx` |
| Tag filter | `src/pages/blog/tag/[slug]/index.astro` | `src/app/blog/tag/[slug]/page.tsx` |

#### Scenario: /blog renders latest 10 posts

- GIVEN a tenant with 15 published posts
- WHEN `/blog` is loaded
- THEN the 10 most recent posts (by `-publishedAt`) SHALL render with cards

#### Scenario: /blog/post/:slug renders full detail

- GIVEN a published post with slug `my-post`
- WHEN `/blog/post/my-post` is loaded
- THEN title, hero image, Lexical body, categories, tags, and SEO meta SHALL render

#### Scenario: Unpublished slug returns 404

- GIVEN a draft post with slug `draft-post`
- WHEN `/blog/post/draft-post` is loaded anonymously
- THEN 404 SHALL be returned

### Requirement: Tenant Filtering in All Queries

Every blog query MUST append `where[tenant.slug][equals]=${TENANT_SLUG}`. This applies to `getAllPosts`, `getPostBySlug`, `getAllCategories`, `getAllTags`, `getPostsByCategory`, and `getPostsByTag`.

#### Scenario: Posts query enforces tenant isolation

- GIVEN `TENANT_SLUG=acme`
- WHEN `getAllPosts()` fetches from Payload REST API
- THEN the URL SHALL include `where[tenant.slug][equals]=acme`

#### Scenario: Category listing is tenant-scoped

- GIVEN `TENANT_SLUG=acme`
- WHEN `getAllCategories()` is called
- THEN only `acme` tenant's categories SHALL be returned

### Requirement: Pagination

Blog index: latest 10 posts, no pager. Category/tag pages: `?page=N` with page size 10.

#### Scenario: Index shows 10 most recent

- GIVEN a tenant with 25 posts
- WHEN `/blog` renders
- THEN exactly 10 posts SHALL appear with no pagination controls

#### Scenario: Category page supports pagination

- GIVEN a category with 25 posts
- WHEN `/blog/category/salud` renders
- THEN posts 1-10 SHALL appear with a link to `?page=2`

### Requirement: SEO Rendering

Post detail pages SHALL render:
- `<title>` from `metaTitle` (fallback to `title`)
- `<meta name="description">` from `metaDescription`
- `og:title`, `og:description`, `og:image` from the same fields

The blog index SHALL render `<title>Blog — {tenantName}</title>`.

#### Scenario: Post renders SEO meta from fields

- GIVEN a post with `metaTitle: "Guía de Nutrición"` and `metaDescription: "Todo lo necesario"`
- WHEN the detail page renders
- THEN `<title>` SHALL be "Guía de Nutrición" and `<meta name="description">` SHALL match

#### Scenario: Missing meta falls back to post title

- GIVEN a post with `title: "Receta"` and no `metaTitle`
- WHEN the detail page renders
- THEN `<title>` SHALL be "Receta"

### Requirement: Lexical → HTML Rendering

Post `content` SHALL be rendered using each starter's existing `src/lib/lexical.ts`. No new library. Supported features match Posts: headings (h2-h4), links, and default root features (paragraphs, lists, quotes, text formatting). Styling via CSS Modules or vanilla CSS — no Tailwind.

#### Scenario: Lexical content renders as semantic HTML

- GIVEN a post with heading, paragraph, and link
- WHEN `renderLexical(post.content)` runs
- THEN output SHALL be `<h2>`, `<p>`, `<a href="...">` with CSS Module classes

### Requirement: Revalidation

Next.js: blog pages SHALL use `revalidate: 60` ISR. Astro: static `getStaticPaths` during build; updates appear on next deploy. No webhook in v1.

#### Scenario: Published post appears on Next.js within 60s

- GIVEN a Next.js frontend with `revalidate: 60`
- WHEN a post is published
- THEN within 60s it SHALL appear on `/blog` and its detail URL

#### Scenario: Astro requires redeploy

- GIVEN an Astro frontend
- WHEN a new post is published
- THEN it SHALL NOT appear until the next Astro build

### Requirement: PostCard and Post Components

Both starters MUST provide:

- **`PostCard`**: hero image, title, date, categories, link to `/blog/post/[slug]`.
- **`Post`**: full hero, title, date, taxonomy badges, Lexical body, SEO meta.

Both styled with Vanilla CSS / CSS Modules / SCSS. No Tailwind.

#### Scenario: PostCard renders metadata

- GIVEN a published post
- WHEN `PostCard` renders
- THEN hero image (via `media.sizes.*.url`), title, date, and category labels SHALL be visible

#### Scenario: Post renders full body

- GIVEN a published post with Lexical `content`
- WHEN `Post` renders
- THEN Lexical body SHALL be converted to HTML and rendered in full

### Requirement: High-Volume Tenant Cap

Astro `getStaticPaths` SHALL cap at 200 posts. Overflow posts SHALL fall back to a `prerender = false` SSR route.

#### Scenario: Under 200 posts → full static

- GIVEN a tenant with 50 posts
- WHEN the Astro site builds
- THEN all 50 detail pages SHALL be statically generated

#### Scenario: Over 200 posts → capped

- GIVEN a tenant with 300 posts
- WHEN the Astro site builds
- THEN at most 200 SHALL have static pages; remaining SHALL use SSR
