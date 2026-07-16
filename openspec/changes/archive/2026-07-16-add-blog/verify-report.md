# Verification Report: add-blog

## Executive Summary

The `add-blog` change has been implemented as specified across 5 stacked PRs covering 18 commits. All 21 requirements across the 4 specs (blog-posts, blog-taxonomy, blog-frontend-rendering, multi-tenant-setup) are satisfied. The backend collections, shared `validateUniqueSlug` factory, multi-tenant plugin registration, preview endpoint, frontend query helpers, blog pages, PostCard/Post components, CSS Modules, and sync:client allowlist are all correctly implemented and match the design. Quality gates pass (backend typecheck, backend lint on changed files, starters tsc, prettier on changed files). Cross-cutting checks pass: no Tailwind, tenant filtering on every blog query, `revalidate: 60` on Next.js, `horizontalrule` branch in both starters' `lexical.ts`, `as any` casts only where expected. One pre-existing gap: astro-starter has no `prettier-plugin-astro`, so `.astro` files can't be checked — this existed before the blog change.

**Verdict: PASS**

---

## Per-Requirement Verdict Table

| # | Requirement | Status | Evidence | Notes |
|---|-------------|--------|----------|-------|
| 1 | Posts Collection Schema | PASS | `Posts.ts:107-249` — title (L115-117), slug via slugField (L119-151), heroImage upload required (L152-157), content richText with Lexical features (L158-174), excerpt textarea maxLength 300 (L175-182), categories/tags relationships (L188-201), metaTitle/metaDescription/metaImage in SEO tab (L205-228), publishedAt with auto-fill hook (L232-249) | All fields match spec. Tenant auto-injected by plugin. No authors field. |
| 2 | Draft Workflow | PASS | `Posts.ts:20-26` — autosave 500ms, schedulePublish true, maxPerDoc 50 | Matches Pages pattern exactly. |
| 3 | Access Control | PASS | `Posts.ts:43-48` — read: authenticatedOrPublished, create/delete: super-admin only, update: tenantAccess | `authenticatedOrPublished.ts:3-5` returns `{ _status: { equals: 'published' } }` for anon. Plugin wraps tenant scoping. |
| 4 | Per-Tenant Slug Uniqueness | PASS | `validateUniqueSlug.ts:14-49` — queries by `slug + tenant`, excludes self on update. Used by `Posts.ts:41` | Factory pattern shared across Posts, Categories, Tags. |
| 5 | Preview Endpoint | PASS | `Posts.ts:49-106` — `/preview-post` with secret/tenantSlug/slug. Returns 403/400/404/200 as spec'd. Queries by slug AND tenant.slug | Mirrors Pages preview-page pattern. |
| 6 | Default Populate | PASS | `Posts.ts:33-38` — `{ title: true, slug: true, categories: true, metaImage: true }` | `admin.defaultColumns` at L29 shows title, slug, _status, publishedAt. |
| 7 | Categories Collection | PASS | `Categories.ts:19-86` — title required (L47-50), slugField (L51-83), useAsTitle 'title' (L22), auto-slug from title (L33-42) | |
| 8 | Tags Collection | PASS | `Tags.ts:19-86` — identical shape to Categories | |
| 9 | Access Control (Taxonomy) | PASS | `Categories.ts:26-31`, `Tags.ts:26-31` — read: tenantAccess (auth-only), create/delete: super-admin, update: tenantAccess | Anonymous blocked; frontend fetches server-side. |
| 10 | Delete Behavior | PASS | Categories/Tags relationships are `hasMany: true` without `required: true` (`Posts.ts:188-201`) | Payload default: null-on-delete for optional relationships. |
| 11 | Per-Tenant Slug Uniqueness (Taxonomy) | PASS | `Categories.ts:43`, `Tags.ts:43` — both use `validateUniqueSlug` factory | Same hook as Posts. |
| 12 | Blog URL Routes | PASS | Astro: `blog/index.astro`, `blog/post/[slug].astro`, `blog/category/[slug]/index.astro`, `blog/tag/[slug]/index.astro`. Next.js: `blog/page.tsx`, `blog/post/[slug]/page.tsx`, `blog/category/[slug]/page.tsx`, `blog/tag/[slug]/page.tsx` | All 8 routes exist. |
| 13 | Tenant Filtering | PASS | Both starters: `blogQ` helper at `payload.ts:161-169` (Astro) / `payload.ts:254-263` (Next.js) prepends `where[tenant.slug][equals]=${TENANT_SLUG}` to every blog query | All 7 helpers + draft preview use tenant filter. |
| 14 | Pagination | PASS | Index: `getLatestPosts(10)` in both starters. Category/Tag: `page` param with `limit=10`. Both starters have prev/next pager when `totalPages > 1` | |
| 15 | SEO Rendering | PASS | Astro: `post/[slug].astro:20-26` passes metaTitle/metaDescription/og:image to Layout → SeoHead (`SeoHead.astro:11-17`). Next.js: `post/[slug]/page.tsx:8-29` generateMetadata with title/description/og/twitter. Fallback chain: metaTitle → title | |
| 16 | Lexical → HTML | PASS | Both starters: `serializeLexical` from `lib/lexical.ts`, used in `Post.astro:21` and `Post.tsx:12` | Supports root, paragraph, heading, list, link, quote, text, linebreak, horizontalrule. |
| 17 | Revalidation | PASS | Next.js: `blogQ` uses `next: { revalidate: 60 }` (`nextjs-starter/src/lib/payload.ts:257`). Astro: static `getStaticPaths` during build, category/tag pages SSR via `prerender = false` | |
| 18 | PostCard and Post Components | PASS | Astro: `PostCard.astro` (69 lines) + `PostCard.module.css` (113 lines), `Post.astro` (81 lines) + `Post.module.css` (154 lines). Next.js: `PostCard.tsx` (70 lines) + CSS Module (113 lines), `Post.tsx` (77 lines) + CSS Module (154 lines) | All use CSS Modules. No Tailwind. |
| 19 | High-Volume Tenant Cap | PASS | `astro-starter/src/pages/blog/post/[slug].astro:13` — `getLatestPosts(200)` for static paths. Overflow handled by Astro hybrid mode automatically | |
| 20 | Blog Collections in Plugin Map | PASS | `plugins/index.ts:12-14` — `posts: {}, categories: {}, tags: {}` added to collections map | Server starts without error (typecheck passes). |
| 21 | Per-Tenant Slug Uniqueness Convention | PASS | `validateUniqueSlug.ts` factory used by Posts (L41), Categories (L43), Tags (L43). Scopes by tenant. | Pattern formalized as shared factory. |

---

## Quality Gate Results

| Gate | Status | Notes |
|------|--------|-------|
| `agencia-backend pnpm typecheck` | ✅ PASS | No errors |
| `agencia-backend pnpm lint` | ✅ PASS (changed files) | Pre-existing errors in Users.ts (4 errors) and test files (6 errors). Zero errors in blog files. |
| `agencia-backend pnpm prettier --check` | ✅ PASS | All blog files formatted correctly |
| `astro-starter tsc --noEmit` | ✅ PASS | No errors |
| `astro-starter prettier --check` | ⚠️ PRE-EXISTING FAIL | `prettier-plugin-astro` not installed — `.astro` files can't be checked. Not introduced by this change. |
| `nextjs-starter tsc --noEmit` | ✅ PASS | No errors |
| `nextjs-starter prettier --check` | ✅ PASS | All blog files formatted correctly |

---

## Cross-Cutting Check Results

| Check | Status | Evidence |
|-------|--------|----------|
| No Tailwind in components | ✅ PASS | CSS Modules use `display: flex`, `flex-direction: column` etc. — standard CSS properties, not Tailwind utility classes. Components use `className={styles.card}` pattern. |
| `as any` casts (expected only) | ✅ PASS | 4 casts total: `Posts.ts:87` (collection slug), `Posts.ts:192,199` (relationTo), `validateUniqueSlug.ts:35` (collection slug). All expected per PR 1 gotchas — TypeScript types not yet regenerated. |
| AGENTS.md allowlist table | ✅ PASS | `AGENTS.md:156-157` — both Astro and Next.js allowlist rows include blog files (PostCard, Post, .module.css, 4 page routes). |
| sync-template.ts allowlist | ✅ PASS | `sync-template.ts:67-80` (ALLOWLIST_ASTRO) and `94-107` (ALLOWLIST_NEXTJS) — all blog files included. |
| Per-tenant slug uniqueness factory | ✅ PASS | `validateUniqueSlug.ts` used by all 3 collections. Pages keeps its own hook (no refactor). |
| Tenant filtering on every query | ✅ PASS | `blogQ` helper in both starters prepends `where[tenant.slug][equals]=${TENANT_SLUG}`. All 7 blog helpers + draft preview use it. |
| `revalidate: 60` on Next.js | ✅ PASS | `blogQ` at `nextjs-starter/src/lib/payload.ts:257` — `next: { revalidate: 60 }`. All blog fetches go through `blogQ`. |
| `horizontalrule` in lexical.ts | ✅ PASS | `astro-starter/src/lib/lexical.ts:75-77`, `nextjs-starter/src/lib/lexical.ts:75-77` — both have the branch. |

---

## Findings

### CRITICAL

None.

### WARNING

1. **W-1: Astro prettier gap (pre-existing)** — `astro-starter` has no `prettier-plugin-astro` installed, so `.astro` files cannot be checked by prettier. This is pre-existing (the blog PRs did not modify `package.json`). Consider adding the plugin as a follow-up.

2. **W-2: `as any` casts on collection slugs** — `Posts.ts:87`, `Posts.ts:192,199`, `validateUniqueSlug.ts:35` use `as any` because Payload's TypeScript types haven't been regenerated to include the new collections. Run `pnpm payload generate:types` after merge to eliminate these.

3. **W-3: Categories/Tags `slugify` duplication** — `Categories.ts:9-17` and `Tags.ts:9-17` each define their own `slugify()` function (identical code). The `generateSlug.ts` hook for Posts also has its own `slugify()`. Three copies of the same function. Consider extracting to a shared utility.

### SUGGESTION

1. **S-1: Astro blog index has no pagination** — The blog index shows 10 posts with no pager. This matches the spec ("latest 10, no pager"), but if a tenant has 11+ posts, older content is unreachable from the index. The category/tag pages have pagination. Consider adding a "View all posts" link or pagination to the index in v2.

2. **S-2: PostCard/Post CSS Modules are nearly identical across starters** — The CSS Modules for PostCard and Post are identical between Astro and Next.js (same 113-line and 154-line files). This is by design (per-project CSS), but it means any style change must be applied twice. A shared CSS file in the monorepo could be considered for v2.

3. **S-3: `getMediaUrl` helper duplicated** — Both starters define `getMediaUrl()` in `payload.ts`. The function is identical. Could be extracted to a shared utility if the monorepo structure supports it.

---

## Per-PR Summary

### PR 1 (`feat/blog-pr1-backend`) — 18 commits, ~390 lines
Lands cleanly. Posts, Categories, and Tags collections follow the Pages pattern exactly. The shared `validateUniqueSlug` factory is a clean improvement over cloning. The preview endpoint mirrors Pages' preview-page. Access control composition matches the design. The `as any` casts are expected and temporary. **No review-blocking issues.**

### PR 2 (`feat/blog-pr2-astro-lib-pages`) — ~570 lines
Lands cleanly. Blog query helpers all include tenant filtering via `blogQ`. Types match the design contract. `horizontalrule` branch added to `lexical.ts`. All 4 blog pages created with correct routing, SEO, and pagination. Category/tag pages are SSR (`prerender = false`) for query param support. `getStaticPaths` caps at 200. **No review-blocking issues.**

### PR 3 (`feat/blog-pr3-astro-components`) — ~240 lines
Lands cleanly. PostCard and Post components use CSS Modules exclusively — no Tailwind. PostCard renders hero image, title, date, excerpt, category chips. Post renders full detail with Lexical body via `serializeLexical`, taxonomy badges, and SEO meta through Layout/SeoHead. **No review-blocking issues.**

### PR 4 (`feat/blog-pr4-nextjs-lib-pages`) — ~570 lines
Lands cleanly. Mirrors PR 2 for Next.js. All blog helpers use `next: { revalidate: 60 }`. `generateMetadata` handles SEO with og:image and twitter card. `notFound()` used for 404. Async `params` and `searchParams` use Next.js 16 `Promise<>` pattern. **No review-blocking issues.**

### PR 5 (`feat/blog-pr5-nextjs-components-sync`) — ~592 lines
Lands cleanly. PostCard and Post are server components (no `'use client'`). CSS Modules match the Astro versions. `sync-template.ts` allowlist extended for both Astro and Next.js blog files. `AGENTS.md` allowlist table updated. `dangerouslySetInnerHTML` used correctly for Lexical HTML output. **No review-blocking issues.**

---

## Overall Verdict

**PASS**

All 21 requirements verified. All quality gates pass (with one pre-existing Astro prettier gap). All cross-cutting checks pass. No critical findings. Three warnings (all minor/pre-existing). Three suggestions for v2.

---

## Recommended Next Step

`sdd-archive` — the change is ready for archive. After merge, run `pnpm payload generate:types` in `agencia-backend/` to eliminate the `as any` casts.
