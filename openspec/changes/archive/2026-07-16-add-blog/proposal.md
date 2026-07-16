# Proposal: Add Blog (Posts, Categories, Tags)

## Why

Agencia's tenants can manage marketing pages and site chrome, but have no content type for long-form, recurring publication. Real clients (lawyers, consultancies, academies, restaurants, small shops) need a blog to publish articles, news, and SEO content. Today, if a client wants a blog, the agency has to fake it with a `TextBlock` on a `Page`. That gives no per-post draft workflow, no taxonomy, no per-post SEO meta, no `/blog/{slug}` URL convention, and an editor surface (the full Page layout composer) that confuses clients writing a 600-word post.

A dedicated blog also unlocks the SEO compounding the agency business model relies on: regular, indexable, internally-linked content. And it matches the agency's split of labor — the developer builds the structure once, the client edits content forever — only if the editing surface is scoped to the job. A focused Posts editor (title + hero + body + taxonomy + meta) is that surface.

## Who

- **Super-admin (developer)** — zero-touch after enabling the three collections in the plugin config. Cares about the same multi-tenant isolation guarantees Pages already get.
- **Tenant-admin (client owner)** — primary user. Wants a fast, focused editor: title, hero, Lexical body, category, tags, meta description, save as draft, preview, publish.
- **Tenant-editor** — same UX as tenant-admin in v1 (read + write within tenant). Future split (editor writes body, admin manages taxonomy) is out of scope.
- **Anonymous reader** — lands on `/blog`, opens `/blog/{slug}`, navigates by category and by tag. Wants clean URLs, fast pages, mobile-friendly rendering, no cross-tenant leaks.

## Outcome

When v1 ships, a tenant-admin logs into their agencia admin, opens the new "Blog" group, creates a Post, writes a Lexical body, picks one category and two tags, fills SEO meta, saves as draft, clicks Preview to see it styled on their own frontend, then clicks Publish. Within 60 seconds the post is live at `https://{client-domain}/blog/{slug}`. The super-admin did nothing.

## Current state

- Payload 3.85.1 + `@payloadcms/plugin-multi-tenant` already isolate `Pages` and `Media` per tenant.
- The `Pages` collection establishes the pattern: hand-rolled `meta`, Payload's built-in `slugField`, a per-tenant `validateUniqueSlug` hook, 500ms autosave drafts, and a custom `/api/pages/preview-page` endpoint with `secret + tenantSlug`.
- `Categories` and `Tags` collection concepts do not exist anywhere in Agencia.
- No `/blog` URL convention in either starter template.
- No `@payloadcms/plugin-seo` is installed — Pages use a hand-rolled meta object and Posts will match that.
- The multi-tenant plugin's `collections` map already lists `pages`, `media`, `header`, `footer` — adding `posts`, `categories`, `tags` is the same shape of change.

## Scope (v1)

### Data model

Three new collections, all multi-tenant-scoped via the plugin's auto-injected `tenant` field.

| Collection  | Fields (high level)                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `Posts`     | `title`, `slug` (unique per tenant), `heroImage` (upload → Media), `content` (Lexical rich text), `categories` (hasMany), `tags` (hasMany), `publishedAt` (auto-fill on publish), `meta` (title + description + image, hand-rolled) |
| `Categories`| `title`, `slug` (unique per tenant). Flat, no hierarchy.                                                                       |
| `Tags`      | `title`, `slug` (unique per tenant). Flat.                                                                                     |

No `authors` field on Posts. No `relatedPosts`. No `imagePosition`. No inline blocks inside `content`.

### Admin UI

- A "Blog" sidebar group for super-admin containing Posts, Categories, Tags. Tenant-scoped users see them under their normal collections.
- Posts list view: title, slug, `_status` (draft/published), `publishedAt`, category count.
- Post edit view with tabs: **Content** (title, hero, Lexical body), **Taxonomy** (categories, tags), **SEO** (meta).
- Drafts autosave every 500 ms. Scheduled publish via Payload's native `_publishOn`.
- "Preview" button in the admin hits a new `/api/posts/preview-post` endpoint, mirroring the Pages pattern (secret + `tenantSlug` + slug → redirect to tenant's frontend preview URL).

### Access control

| Role             | Posts                              | Categories / Tags                  |
| ---------------- | ---------------------------------- | ---------------------------------- |
| `super-admin`    | full CRUD across all tenants       | full CRUD across all tenants       |
| `tenant-admin`   | full CRUD within assigned tenants  | full CRUD within assigned tenants  |
| `tenant-editor`  | full CRUD within assigned tenants  | full CRUD within assigned tenants  |
| anonymous        | read published only, tenant-scoped | not exposed in public API reads    |

### Multi-tenant behavior

- `posts`, `categories`, `tags` registered in the multi-tenant plugin's `collections` map.
- Per-tenant slug uniqueness via a `validateUniqueSlug` clone that includes `tenant` in the `where` clause.
- The `tenant` field is auto-injected by the plugin; no manual field on the schema.

### Frontend rendering

- Both `astro-starter` and `nextjs-starter` get new helpers: `getAllPosts`, `getPostBySlug`, `getAllCategories`, `getAllTags`, `getPostsByCategory`, `getPostsByTag` — all appending `where[tenant.slug][equals]=${TENANT_SLUG}` to the existing pattern.
- New routes in both starters: `/blog` (index), `/blog/post/[slug]` (detail), `/blog/category/[slug]` (filter), `/blog/tag/[slug]` (filter).
- New components in each starter: `PostCard`, `Post` (detail layout). Styled per project (Vanilla CSS / CSS Modules / SCSS). **No Tailwind.**
- Lexical body rendered via the existing `src/lib/lexical.ts` in each starter (already supports root, paragraphs, headings, lists, links, quotes, line breaks).
- Revalidation: `revalidate: 60` for Next.js ISR (already the convention for Pages); Astro rebuilds on deploy. **No webhook in v1.**

### SEO

- Hand-rolled `meta.title` + `meta.description` + `meta.image` mirroring Pages.
- Frontends render `<title>` and `<meta name="description">` from these fields on the post detail page.

### Rich text (Lexical)

HeadingFeature (h2, h3, h4), LinkFeature, InlineToolbarFeature, FixedToolbarFeature, HorizontalRuleFeature, plus the default root + paragraph + list + quote + text features. **No BlocksFeature** — Posts.content is text only.

## Non-goals (v1)

- **Comments** — no Comments collection, no Turnstile, no moderation UI. v2.
- **Search** — no full-text search UI. Category/tag filtering is enough.
- **Multi-author** — no `authors` relationship on Posts. The `createdBy` field from the multi-tenant plugin records who created the draft.
- **Inline blocks in Post body** — `Posts.content` is Lexical text only. The agency's block system (Hero/Text/Image/Contact/Menu/Product/Cart/Course) stays scoped to `Pages.layout`.
- **Related posts** — no `relatedPosts` relationship.
- **Image focal point UI** — no `imagePosition` field. CSS `object-fit: cover` + `object-position: center` is enough.
- **Webhook revalidation** — rely on existing ISR / build-on-deploy.
- **Custom pagination UI** — `?page=N` query param only; no fancy pager.
- **Adoption of `@payloadcms/plugin-seo`** — stay consistent with Pages.
- **Post → tenant reassignment** — once a post is created, its tenant is fixed.

## Edge cases

| Scenario                                                                | v1 behavior                                                                                                                       |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Two tenants publish a post with the same slug (`mi-primer-post`)        | Both succeed. `validateUniqueSlug` is scoped per-tenant. Each lives at its own frontend domain.                                   |
| Tenant-admin deletes a Category that has posts                          | Posts become uncategorized (the relationship is `hasMany`; the post is **not** deleted). Same for Tags.                             |
| Draft preview link shared with someone outside the tenant               | The preview URL contains a server-side secret + a short-lived draft token. Without the secret, the frontend rejects the request.   |
| Post is published, then unpublished                                    | Removed from listings (`where[_status][equals]=published` filter). Direct URL returns 404. Version history preserved; republish restores. |
| Post has no categories or no tags                                       | Allowed. Taxonomy is optional in v1.                                                                                              |
| Slug is changed after publish                                          | Old URL breaks (no 301 in v1). Version history preserves the old slug. Super-admin sees a console warning on slug change.        |
| Post is created without a `heroImage`                                  | `heroImage` is required. Card layout assumes an image.                                                                            |
| Two Categories in the same tenant share a title                        | Allowed. The `slug` is the unique key, not the title.                                                                             |
| High-volume tenant (>200 posts)                                         | Astro `getStaticPaths` caps at 200; overflow falls back to a `prerender = false` SSR route. Documented in the spec.              |

## Success criteria

- [ ] A tenant-admin can create, edit (autosaved), preview, and publish a Post end-to-end without developer intervention.
- [ ] An anonymous visitor to a tenant's frontend can browse `/blog`, open a post, navigate by category and by tag, and reach 404 for unpublished slugs.
- [ ] Two tenants can each publish a post with the same slug; each appears on its own frontend with no cross-tenant leak.
- [ ] A super-admin can roll out the blog to a new tenant by registering the three collections in the plugin config — no schema migration beyond `pnpm payload migrate`.
- [ ] The combined PR surface is ≤ 4 PRs, each ≤ 400 changed lines (excluding generated types and lockfile).
- [ ] Existing Pages and Media functionality is unaffected (no regression in admin or frontend).

## Tradeoffs

| What we give up                                     | Why it's worth it                                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Comments (engagement, social proof)                 | Keeps v1 to 4 PRs and skips Turnstile + moderation + spam infra. Two out of three tenants won't need comments anyway. |
| Multi-author display on Post cards                  | Cleaner card UX; no N+1 risk from a `populatedAuthors` afterRead hook. Tenant typically has one author.      |
| Full-text search                                    | Category/tag navigation covers the common "find related" use case. Adding search later is non-breaking.        |
| Inline blocks inside Post body                      | Posts and Pages serve different intents (long-form text vs. landing-page composition). One editor per intent. |
| On-demand revalidation webhook                      | Up to 60s staleness on Next.js fronts is acceptable for v1; avoids deploy-hook config per client.            |
| Fancy social-card preview UI                        | Stays consistent with Pages. No new dependency to maintain.                                                  |
| 301 redirects on slug change                        | Spec scope creep. v1 is additive; v2 can add a redirect rules collection.                                    |

## Risks

| Risk                                                          | Mitigation                                                                                                       |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Multi-tenant slug collisions silently breaking routing        | Per-tenant `validateUniqueSlug` hook (cloned from Pages) + admin warning on slug change of a published post.     |
| No automated tests for cross-tenant access boundaries         | Spec phase adds a minimal set of integration tests for cross-tenant read/write — the one place tests are non-negotiable even with strict TDD off. |
| Astro `getStaticPaths` rebuild cost for high-volume tenants   | Cap at 200 posts; overflow falls back to a `prerender = false` SSR route.                                        |
| Template CSS isolation (per-project)                          | Components live in each starter, not the central backend. `sync:client` allowlist extended to ship blog pages + components. |
| Draft preview secret leak                                     | Secret is per-tenant (set on the `Tenants` collection); tenant-admin can rotate. All preview fetches logged.     |

## Open questions

None. All ten open questions surfaced by the exploration phase have been locked:

1. Comments → **deferred to v2**
2. Drafts + live preview → **included** (autosave 500 ms + `/api/posts/preview-post`)
3. Categories + Tags → **both included**
4. Multi-author → **dropped** (use `createdBy`)
5. Revalidation → **simple** (`revalidate: 60` + Astro build-on-deploy; no webhook)
6. Pagination → `?page=N` query param, no custom UI
7. Search → **deferred**
8. Inline blocks in body → **not included**
9. Admin sidebar group → "Blog" group for super-admin
10. Image focal point → **dropped** (use CSS)

## Capabilities (handoff to sdd-spec)

The sdd-spec phase must produce or update these specs:

### New capabilities

- **`blog-posts`** — Posts collection, draft workflow, multi-tenant scoping, per-tenant slug uniqueness, access control, preview endpoint.
- **`blog-taxonomy`** — Categories and Tags collections, access control, relationship rules, delete-with-posts behavior.
- **`blog-frontend-rendering`** — frontend URL convention (`/blog`, `/blog/post/[slug]`, `/blog/category/[slug]`, `/blog/tag/[slug]`), shared helpers in each starter, preview URL contract, ISR / build-on-deploy rules.

### Modified capabilities

- **`multi-tenant-setup`** — extend the `collections` map in the plugin config to include `posts`, `categories`, `tags`. Add a requirement that any new multi-tenant collection MUST have per-tenant slug uniqueness.

No other spec changes. The Versions/Drafts model already covers the Posts draft workflow (no need to extend `versions-drafts-pages` — a separate capability is cleaner). The Pages spec is unaffected.
