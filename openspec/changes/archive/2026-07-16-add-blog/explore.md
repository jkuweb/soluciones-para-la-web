# Exploration: Add Blog (Posts, Categories, Tags) to Agencia

## 1. Executive Summary

This change adds a multi-tenant blog to Agencia: three new Payload collections (`Posts`, `Categories`, `Tags`) registered with `@payloadcms/plugin-multi-tenant`, plus shared rendering utilities that work in both the `astro-starter/` (static SSG) and `nextjs-starter/` (dynamic ISR) templates. The reference is the single-tenant Payload blog at `/home/joseba/Clientes/educarSano` (`Posts`, `Categories`, `Tags`, `Comments`, plus a Lexical-based rich-text pipeline). The scope recommended for v1 is Posts + Categories + Tags + a frontend renderer; Comments, search, and pagination patterns are explicitly **deferred** to keep the first PR small and the templates generic.

---

## 2. Reference Patterns Discovered (educarSano)

### 2.1 Posts collection

**File:** `educarSano/backend/src/collections/Posts/Posts.ts` (245 lines)

Field shape and notable details (cited with line numbers):

| Field         | Line  | Type / config                                                                                                                                                                                                                                                                |
| ------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`       | 60–64 | `text`, `required: true`, no max length set, no localization.                                                                                                                                                                                                               |
| `heroImage`   | 71–75 | `upload` → `relationTo: 'media'`, `required: true`. Image position lives in a separate `imagePosition: 'top'\|'center'\|'bottom'` select (line 78–87). No upload size config — relies on `Media` collection.                                                                                                          |
| `content`     | 89–106 | `richText` with `lexicalEditor(...)` features: root features + `HeadingFeature({ enabledHeadingSizes: ['h1','h2','h3','h4'] })`, `BlocksFeature({ blocks: [Banner, MediaBlock] })`, `FixedToolbarFeature`, `InlineToolbarFeature`, `HorizontalRuleFeature`, `LinkFeature`. `required: true`. |
| `relatedPosts`| 113–127 | `relationship` → `posts`, `hasMany`, sidebar; `filterOptions` excludes the current id (`not_in`).                                                                                                                                                                            |
| `categories`  | 129–136 | `relationship` → `categories`, `hasMany`, sidebar.                                                                                                                                                                                                                          |
| `tags`        | 138–145 | `relationship` → `tags`, `hasMany`, sidebar.                                                                                                                                                                                                                                 |
| `meta`        | 150–171 | SEO tab using `@payloadcms/plugin-seo` field group: `OverviewField`, `MetaTitleField({ hasGenerateFn: true })`, `MetaImageField({ relationTo: 'media' })`, `MetaDescriptionField({})`, `PreviewField({ hasGenerateFn: true })`.                                  |
| `publishedAt` | 176–194 | `date` in sidebar. `beforeChange` hook auto-fills `new Date()` when `_status === 'published'` and value missing.                                                                                                                                                              |
| `authors`     | 196–207 | `relationship` → `users`, `hasMany`, `required`, sidebar. `beforeChange: [assignCreatedBy]` only assigns on `create` — see below.                                                                                                                                              |
| `populatedAuthors` | 209–228 | `array` of `{ id, name }`, `access.update: () => false`, `admin.readOnly: true`, populated by `afterRead` hook — caches author names so REST responses don't have to recursively fetch users.                                                                  |
| `slug`        | 229   | From `slugField()` helper (see 2.6).                                                                                                                                                                                                                                         |

Collection-level config:

- `defaultPopulate` (lines 33–41) returns only `title`, `slug`, `categories`, and a slim `meta` (image, description). This is what the admin list view and lightweight listings use.
- `access` (42–47): `read: publicAccess`, `create/update/delete: isAdminOrUser`. **No draft filtering for anonymous reads** — unauthenticated callers see the post regardless of `_status`. Drafts are protected by the version draft API instead. (See 2.5.)
- `admin.preview` (50–54): returns `${FRONTEND_URL}/preview/post/${slug}?secret=${PREVIEW_SECRET}`. Agencia already has a comparable preview flow (Pages.ts 88–96 uses `/preview?path=...&secret=...`).
- `admin.group: 'Blog'` plus `groupBy: true` — Posts group themselves under "Blog" in the sidebar (lines 56–57).
- `versions.drafts.autosave.interval: 100` and `schedulePublish: true`, `maxPerDoc: 50` (lines 237–244). **Note:** 100ms autosave is aggressive; Agencia's Pages uses 500ms.

### 2.2 Posts hooks

**`Posts/hooks/populateAuthors.ts`** (33 lines): `CollectionAfterReadHook`. Iterates `doc.authors`, calls `payload.findByID({ collection: 'users', depth: 0 })`, stores `{ id, name }` in `doc.populatedAuthors`. Errors are swallowed (try/catch with no throw) — this is fragile but matches "best effort" semantics. **Gotcha:** if a post has many authors and `defaultPopulate` is used, the full `authors` array is still loaded and the loop runs on every read. Consider replacing with a Payload `virtual: true` field or a join field.

**`Posts/hooks/revalidatePost.ts`** (44 lines):

- `revalidatePost` (`afterChange`): if `context.disableRevalidate` is not set AND `doc._status === 'published'`, calls Next.js `revalidatePath('/blog/posts/${slug}')` + `revalidateTag('posts-sitemap')`. Also revalidates the **old path** when a previously-published post changes slug/status.
- `revalidateDelete` (`afterDelete`): revalidates `/blog/posts/${doc.slug}` and `'posts-sitemap'`.

**Gotcha for Agencia:** `revalidatePath` and `revalidateTag` from `next/cache` only work inside a Next.js process. The Agencia backend is Payload-only (no Next.js server side) — frontends are separate repos. The equivalent in Agencia is **HTTP revalidation**: a webhook from Payload's `afterChange` hitting a per-client revalidation endpoint, **or** clients polling Payload, **or** ISR `revalidate: N` timers (already used in `nextjs-starter/src/lib/payload.ts` line 81 with `next: { revalidate: 60 }`).

### 2.3 Categories and Tags collections

**Files:** `educarSano/backend/src/collections/Categories.ts` (32 lines) and `Tags.ts` (35 lines).

Both are minimal, identical-shaped collections:

```ts
{ slug, title (required), ...slugField() }
```

- `access`: `read: publicAccess`, `create/update/delete: isAdminOrUser` (admin-or-user only — no anonymous writes, no per-author restrictions).
- `admin.useAsTitle: 'title'`, `admin.group: 'Blog'`.
- `hooks.afterChange/afterDelete: [afterChangeHook, afterDeleteHook]` — reference a `Settings` collection that updates `lastContentChange`. **This `Settings` collection does NOT exist in Agencia** (`agencia-backend/src/collections/` only has `Pages, Media, Tenants, Users, Header, Footer, Footer.ts, Header.ts`). The `afterChangeHook` is therefore **not portable** to Agencia as-is; drop it.
- **No parent/hierarchy** — Categories are flat. Posts use `hasMany: true` relationships. There is no nested category tree.

### 2.4 Comments collection

**File:** `educarSano/backend/src/collections/Comments/Comments.ts` (215 lines)

- `access.read`: authenticated users see all; anonymous sees only `status: 'approved'`.
- `access.create/update/delete`: require authenticated user. **No public create** — public comment submission goes through a custom `POST /api/submit-comment` endpoint (`backend/src/endpoints/submitComment.ts`, 264 lines) that wraps Cloudflare Turnstile verification, rate-limiting (5/hour/IP), spam keyword filter, and sets `status: 'pending' | 'spam'`.
- Fields: `post` (rel), `authorName`, `authorEmail`, `content` (textarea, max 2000), `status` (pending/approved/rejected/spam), `isAdminReply` (checkbox), `adminUser` (rel, conditional), `ipAddress`, `userAgent`, `parentComment` (self-rel, conditional filter on `depth < 3`), `depth` (number).
- `beforeValidate` hook: if `req.user` is set on create, marks `isAdminReply=true`, `adminUser=user.id`, `status='approved'`, and fills `authorName`/`authorEmail` defaults.
- `beforeChange` hook: walks `parentComment`, computes `depth = parent.depth + 1`, throws if `depth > 3`.

**Verdict for v1 scope:** This is a self-contained, sophisticated feature with its own endpoint, anti-spam, and moderation UI. **Defer to v2.** Including Comments in v1 triples the surface area (endpoint + hooks + custom React form + Cloudflare Turnstile + moderation admin) and is not required for the agency model where the developer's clients typically don't need public commenting (they edit content; they don't run a community blog).

### 2.5 Versions / drafts (how "drafts" are read)

Reference does **not** filter anonymous `read` by `_status`. Instead, it relies on Payload's draft API:

- `versions.drafts.autosave: { interval: 100 }` — local autosave on the edit screen.
- The frontend never fetches a draft directly via REST. The admin's `preview` button hits the custom `FRONTEND_URL/preview/post/${slug}?secret=${PREVIEW_SECRET}` page, which uses the `draft: 'true'` query on the local API.

For Agencia: The existing `Pages` collection uses the same pattern (custom `/preview-page` endpoint with `secret` + `tenantSlug` — see `agencia-backend/src/collections/Pages.ts` lines 153–198). The Posts collection should reuse the same approach.

### 2.6 Reusable helpers (educarSano)

- **`slugField()`** at `educarSano/backend/src/fields/slug/index.ts` (68 lines): returns a `[TextField, CheckboxField]` pair — a `slug` text field (indexed, required, sidebar, with a custom `Field` component `SlugComponent` that reads from a sibling field) and a `slugLock` checkbox. **Not directly portable** — it lives in `@/fields/slug` which Agencia doesn't have. Agencia's Pages uses Payload's built-in `slugField` from `payload` (line 2 of `Pages.ts`).
- **`assignCreatedBy`** at `educarSano/backend/src/hooks/assignCreatedBy.ts` (8 lines): trivial `FieldHook` that on `operation === 'create'` returns `req.user.id`. Works for any relationship-to-users field. Portable.
- **`isAdminOrUser`** at `educarSano/backend/src/access/index.ts` lines 30–33: boolean access — `user.roles?.includes('admin') || user.roles?.includes('user')`. **Not portable** — Agencia uses `super-admin / tenant-admin / tenant-editor`. See 3.2.
- **`publicAccess`** at `educarSano/backend/src/access/index.ts` line 45: `() => true`. Portable.
- **`trackChanges.ts`** hooks update a `Settings` global that **does not exist in Agencia**. Drop.

### 2.7 Frontend rendering (educarSano/frontend)

**File layout** (`frontend/src/pages/blog/`):

```
index.astro                  # Blog home — search/filter, list
post/[slug].astro            # Static detail
category/[slug]/
  index.astro                # Page 1
  page/[page].astro          # Pages 2..N
tag/[slug]/
  index.astro                # Page 1
  page/[page].astro          # Pages 2..N
```

All pages use `export const prerender = true` and `getStaticPaths()`. Astro SSG rebuilds the entire site whenever Payload emits a redeploy signal (`backend/src/endpoints/redeploy.ts` + the `RedeployButton` in admin chrome). The Astro 5 build is triggered by an external trigger — Astro does not natively revalidate like Next.js.

**Lib helpers** (`frontend/src/lib/`):

- `getAllPosts.ts` (38 lines) — `fetch /posts?where[_status][equals]=published&sort=-publishedAt&limit=N`, key `'sort:-publishedAt:limit:100:page:1:status:published'`, in-memory cache via `getCacheKey/getFromCache/setCache` (`utils/cache.ts`).
- `getPostBySlug.ts` (38 lines) — `where[slug][equals]=${slug}&limit=1&depth=2`. `depth: 2` populates categories/tags authors/media.
- `getPostsByCategory.ts` / `getPostByTag.ts` — `where[categories.slug][equals]=${slug}` / `where[tags.slug][equals]=${slug}`, returns `{ posts, totalPages, totalDocs }`.
- `getAllCategories.ts` / `getAllTags.ts` — flat lists, sorted by `title`.

All use `payloadFetch` from `utils/payloadFetch.ts` (the reference wraps `fetch` with auth headers, error handling, and a request log).

**Components** (`frontend/src/components/`):

- `PostCard/PostCard.astro` (243 lines) — single post card. Uses `populatedAuthors`, `meta.image`, `categories`, `tags`, `publishedAt`, `imagePosition`. Heavily styled with **Tailwind 4** (`bg-[var(--blog-post-background-color)]`, `hover:scale-110`, `transition-transform`). **Not portable** — Agencia forbids Tailwind.
- `Post/Post.astro` (149 lines) — full post detail. Renders `RichText`, `ShareButtons`, `CommentSection`, and a `relatedPosts` grid. Loads `heroImage` via `AstroImage` (which uses Unpic to resolve to a Cloudinary URL — Payload's `media.sizes` are NOT used).
- `RichText/RichText.astro` (248 lines) — custom Lexical-to-HTML serializer + block switch (Banner, MediaBlock, etc.). **Heavily Tailwind-styled** (`mx-auto rounded-lg`, `class="richtext ..."` + `styles/richtext.css`). The serializer logic is portable; the block switch and styles are not.
- `Pagination/PaginationStatic.astro` (134 lines) — generic prev/next + numeric pager; takes `currentPage, totalPages, basePath`. **Style is Tailwind-only.**
- `SearchAndFilter/SearchAndFilter.tsx` (435 lines) — Fuse.js client-side fuzzy search over `posts`, with multi-select categories/tags filters, debounced query, and client-side pagination (6 per page). Hydrated with `client:visible`. **Heavy React component; Tailwind-only classes.**
- `CommentSection/CommentSection.tsx` (486 lines) — full thread UI (replies, admin badges, Turnstile). Out of v1 scope.

**Payload API query syntax used by the reference (key for design):**

```
GET /api/posts?where[_status][equals]=published&sort=-publishedAt&limit=100&depth=2
GET /api/posts?where[slug][equals]=${slug}&limit=1&depth=2
GET /api/posts?where[categories.slug][equals]=${slug}&limit=6&page=1&sort=-publishedAt
GET /api/posts?where[tags.slug][equals]=${slug}&limit=6&page=1&sort=-publishedAt
GET /api/categories?sort=title
GET /api/tags?sort=title
```

These are all standard Payload REST URL search params. They work identically in Agencia (the only addition is `where[tenant.slug][equals]=${TENANT_SLUG}` — see 3.1).

### 2.8 SEO plugin

`@payloadcms/plugin-seo` is already a dependency in the reference (`Posts.ts` lines 18–24) and provides the `OverviewField / MetaTitleField / MetaImageField / MetaDescriptionField / PreviewField` group. **Agencia does NOT currently include this plugin** — Pages have a hand-rolled `meta` field (`Pages.ts` 283–298: `title`, `description`, no `image`). For v1, the simplest path is to **copy the same hand-rolled pattern as Pages** (text `title` + textarea `description` + image `upload → media`). Adopting `@payloadcms/plugin-seo` is a larger decision (admin UI rewrite) and should be deferred.

### 2.9 Cloudinary / Media

`Media.ts` in Agencia already defines `imageSizes: thumbnail (400×300), card (768×1024), hero (1920×1080)` (lines 46–50). These are reusable for blog hero images. **The reference uses Unpic to resolve media URLs at SSR time** (`Post.astro` line 67: `src={unpicUrl!}`) — Agencia should use `media.sizes.hero.url` (or `media.url`) instead, since the templates don't currently integrate Unpic.

---

## 3. Adaptation Map — Reference → Agencia

### 3.1 The single most critical change: tenant scoping

Every Payload collection in Agencia that's part of the multi-tenant plugin must be listed in `agencia-backend/src/plugins/index.ts`. Today it registers:

```ts
collections: { pages: {}, media: {}, header: {}, footer: {} }
```

Adding `posts: {}, categories: {}, tags: {}` will:

- Inject a `tenant` relationship field on each.
- Filter admin lists to the current tenant (unless `useUsersTenantFilter: false`, which is the current Agencia setting).
- Wrap access control with the plugin's `addCollectionAccess` (so existing access functions still apply, but cross-tenant data is hidden).

**All REST queries from the frontends must add `where[tenant.slug][equals]=${TENANT_SLUG}`** — this is the convention already in use in `astro-starter/src/lib/payload.ts` (line 9) and `nextjs-starter/src/lib/payload.ts` (line 76). The reference has no tenant filter; the new helpers MUST add it.

### 3.2 Mapping access control

| Reference role | Agencia role | What they can do with blog |
| -------------- | ------------ | -------------------------- |
| `admin`        | `super-admin` | All tenants, all CRUD on Posts/Categories/Tags. |
| `user`         | `tenant-admin` | Full CRUD on Posts/Categories/Tags within assigned tenants. |
| `guest`        | `tenant-editor` | For v1, treat same as `tenant-admin` (read + write within tenant). Future split: editor can edit Post content but not Categories/Tags structure. |
| (anon)         | (anon)        | Read published posts for the current tenant only. (See 3.4.) |

The new access functions should live in `agencia-backend/src/access/` next to the existing `tenantAccess.ts` (29 lines) and reuse `resolveTenantIds(user)` (already exists at `agencia-backend/src/utilities/resolveTenantIds.ts`).

**`read` access for Posts must be tenant-scoped AND draft-aware.** The current `Pages` collection uses:

```ts
return user ? { tenant: { in: tenantIds } } : { _status: { equals: 'published' } }
```

Posts should follow the same pattern.

### 3.3 Carry-over vs. change vs. new

| Concern              | Reference (educarSano)                                       | Agencia (target)                                                                                                                       | Type        |
| -------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `Posts.title`        | text, required                                               | Same — text, required, **plus `tenant` relationship (auto-injected)**                                                                  | Carries     |
| `Posts.heroImage`    | upload → media, required                                     | Same — required, upload → media. (Media already has 3 image sizes; reuse `media.sizes.hero`.)                                          | Carries     |
| `Posts.content`      | Lexical with Banner + MediaBlock features                    | Same Lexical features, **minus the inline Banner/MediaBlock blocks** (no banner block exists in Agencia). Use root + headings + links + inline marks only. | Adapts      |
| `Posts.publishedAt`  | date + auto-fill on publish                                  | Same                                                                                                                                   | Carries     |
| `Posts.authors`      | relationship → users, hasMany, required                      | **Drop `required`** (or default to `req.user`). Agencia users are tenant-scoped; a tenant-editor without a user ref would break.       | Adapts      |
| `Posts.populatedAuthors` | virtual via afterRead hook                              | **Skip entirely** in v1. The agency template doesn't need author names on cards (author display is a future enhancement).            | Drops       |
| `Posts.relatedPosts` | relationship, sidebar                                        | **Defer to v2.** Adds N+1 risk and template coupling.                                                                                  | Defer       |
| `Posts.meta` (SEO)   | @payloadcms/plugin-seo fields                                | Hand-rolled `meta.title` + `meta.description` + `meta.image` to match Pages.                                                          | Adapts      |
| `Posts.versions.drafts` | enabled, autosave 100ms                                  | **autosave: 500ms** (match Pages). `schedulePublish: true`. `maxPerDoc: 50`.                                                          | Adapts      |
| `Posts.access.read`  | `publicAccess`                                               | Tenant-scoped + draft-aware: super-admin → all; tenant users → own tenant; anon → `{ tenant.slug: TENANT_SLUG, _status: published }` | Adapts      |
| `Posts.access.create/update/delete` | `isAdminOrUser`                              | super-admin all; tenant-admin/editor in their tenant                                                                                   | Adapts      |
| `Posts.defaultPopulate` | title, slug, categories, meta.image, meta.description    | Same                                                                                                                                   | Carries     |
| `Posts.admin.preview`| `${FRONTEND_URL}/preview/post/${slug}?secret=...`            | **Per-tenant:** read tenant.devUrl or derive from frontendType, like Pages.ts 29–73. Output `${base}/preview/blog/${slug}?path=...&secret=...&tenantSlug=...` | Adapts |
| `Posts.tenant`       | N/A                                                          | **Auto-injected by multi-tenant plugin.** No manual field.                                                                              | New         |
| `Categories`         | `{ title, slug }`, public read, admin-or-user write         | Same fields, **plus tenant field (auto)**. Access: tenant-scoped reads; super-admin + tenant-admin write within tenant.             | Adapts      |
| `Tags`               | `{ title, slug }`, public read, admin-or-user write         | Same                                                                                                                                   | Adapts      |
| `Comments`           | full collection + endpoint + Turnstile                      | **Defer to v2.**                                                                                                                       | Defer       |
| `afterChange.trackChanges` | updates Settings global                             | **Drop.** Agencia has no Settings global.                                                                                              | Drops       |
| Revalidation         | `revalidatePath` from `next/cache`                           | **Cannot use Next.js revalidate in Payload-only backend.** Options: (a) revalidate via per-tenant HTTP endpoint + webhook, (b) rely on `next: { revalidate: 60 }` in Next.js starter and Astro's build-on-deploy. Recommend (a) for published, (b) for caching. | Adapts |
| Frontend list        | Astro `prerender = true` + `getStaticPaths`                  | Same in Astro starter. **Next.js starter:** `generateStaticParams` + `revalidate: 60` (already the convention for Pages).             | Adapts      |
| Frontend detail      | Astro `[slug].astro` with `getStaticPaths`                  | Same                                                                                                                                   | Carries     |
| Lexical renderer     | `RichText.astro` custom Lexical→HTML                        | **Reuse the existing `astro-starter/src/lib/lexical.ts`** (already handles root/paragraph/heading/list/text/quote/link/linebreak). For the new content features, ensure it also handles `BlocksFeature` blocks if any sneak in. | Adapts |
| PostCard             | Tailwind 4                                                   | **Vanilla CSS / CSS Module per project.** No Tailwind. Must be designed into the per-client project.                                  | New         |
| Post detail layout   | Tailwind                                                     | Vanilla CSS / CSS Module                                                                                                              | New         |
| `SearchAndFilter`    | 435-line React component with Fuse.js                        | **Defer to v2.** A simple server-filtered list (by category slug, tag slug, query param `?q=`) is enough for v1.                        | Defer       |
| Pagination           | Tailwind + `PaginationStatic.astro`                          | **Defer to v2.** v1 lists paginate via standard `page=1&limit=10` query params. Astro: use `getStaticPaths` with `page/[page].astro` like the reference. Next.js: `searchParams.page`. | Defer (partial) |
| Live preview         | `/preview/post/{slug}?secret=...`                            | Match the existing Pages pattern: `/preview?path=/blog/{slug}&secret=...&tenantSlug=...` and a custom `/api/posts/preview-post` endpoint that mirrors `Pages.ts` 153–198. | Adapts      |
| Custom block content | Banner, MediaBlock, QuoteBlock, etc. (in `Posts.content`)    | **None in v1.** Agencia's block system lives in `Pages.layout` (Hero/Text/Image/Contact/Menu/Product/Cart/Course). Posts use only Lexical text + headings + links. This keeps posts simple and decoupled from the page-block system. | Drops       |
| `slugField` helper   | custom field component                                       | **Use Payload's built-in `slugField` from `'payload'`** (already used in `Pages.ts` line 2). Agency has a super-admin/tenant-admin split: hide slug for non-super-admins and auto-generate on `beforeValidate` (mirror `Pages/hooks/generateSlug.ts`). | Adapts      |
| `assignCreatedBy`    | `({ req, operation }) => operation === 'create' ? req.user.id : value` | **Drop.** Authors field is deferred (no `authors` field on Posts in v1).                                                              | Drops       |
| `populateAuthors`    | afterRead hook                                               | **Drop** (no `authors` field in v1).                                                                                                  | Drops       |
| `lexicalToHTML` (RichText.astro) | hand-rolled Lexical serializer with Tailwind       | **Reuse `astro-starter/src/lib/lexical.ts`** and add a CSS module for typography. The serializer logic there covers the features Posts.content will use. | Adapts      |
| `ShareButtons`       | React + Web Share API                                        | **Defer.** Optional social share UI.                                                                                                   | Defer       |
| Cloudinary URLs      | via Unpic `unpicUrl`                                         | Use `media.sizes.hero.url || media.url` directly. Cloudinary can be wired later via the agency's own cloud-storage plugin (currently absent). | Adapts      |
| Astro config         | `prerender = true` everywhere, no on-demand revalidation    | Same. Trigger redeploy via a Payload `afterChange` webhook to the frontend host (Vercel/Netlify deploy hook).                          | Carries     |
| Next.js config       | N/A in reference (Astro only)                                | `next: { revalidate: 60 }` for lists and detail, `cache: 'no-store'` for drafts. Already the convention in `nextjs-starter/src/lib/payload.ts`. | New         |

### 3.4 What the v1 frontend looks like in each starter

Both starters already fetch Payload with a `TENANT_SLUG` env. The new blog helpers live in each starter's `src/lib/payload.ts` (one add per file). Pseudocode for what v1 needs in each:

```ts
// In astro-starter/src/lib/payload.ts and nextjs-starter/src/lib/payload.ts
export async function getAllPosts({ limit = 10, page = 1 } = {}) {
  const res = await fetch(
    `${PAYLOAD_API_URL}/posts?where[tenant.slug][equals]=${TENANT_SLUG}` +
      `&where[_status][equals]=published&sort=-publishedAt&limit=${limit}&page=${page}&depth=2`
  )
  return (await res.json()) // { docs, totalDocs, totalPages }
}

export async function getPostBySlug(slug: string) { /* where[slug][equals]+tenant */ }
export async function getAllCategories()           { /* categories?where[tenant.slug]=TENANT_SLUG */ }
export async function getAllTags()                 { /* tags?where[tenant.slug]=TENANT_SLUG */ }
export async function getPostsByCategory(slug)    { /* where[categories.slug][equals]=${slug}+tenant */ }
export async function getPostsByTag(slug)          { /* where[tags.slug][equals]=${slug}+tenant */ }
```

Astro page list (`astro-starter/src/pages/blog/index.astro`) and detail (`astro-starter/src/pages/blog/post/[slug].astro`) follow the existing pattern from `[slug].astro` (`astro-starter/src/pages/[slug].astro`, 25 lines): `getStaticPaths` calls `getAllPosts`/`getAllCategories`, then renders `PostCard.astro` (new) or `Post.astro` (new).

Next.js list (`nextjs-starter/src/app/blog/page.tsx` — new) and detail (`nextjs-starter/src/app/blog/[slug]/page.tsx` — new) follow the pattern from `nextjs-starter/src/app/[slug]/page.tsx`. The next.js starter uses `generateStaticParams` for SSG, but since the file is dynamic, the `next: { revalidate: 60 }` option will trigger ISR rebuilds without redeploys.

---

## 4. Open Questions (need user clarification before spec)

1. **Should v1 include Comments?** The reference has a complete comments system. Agencia's design language is "developer builds the structure, client edits content" — so client-run comments may not be in scope. Recommendation: **defer to v2.** Confirm.

2. **Should v1 support drafts/auto-save and live preview?** The reference does. The Pages collection in Agencia already does. **Recommendation: include drafts + 500ms autosave (matching Pages) + a `/preview/blog/{slug}?tenantSlug=...&secret=...` route.** Confirm.

3. **Categories vs. Tags — both, one, or neither?** Reference has both, flat. **Recommendation: include both for v1 (they're cheap).** If the user wants only one, prefer Tags (simpler, less admin UI). Confirm.

4. **Author display on Post cards?** Reference renders `populatedAuthors` on every card. The agency's "developer-only authoring" model means there's typically one author per tenant, and showing the author name is mostly noise. **Recommendation: skip `authors` field on Posts in v1; add it later if a client requests it.** Confirm.

5. **Pagination strategy in v1?** The reference has 6/page on category/tag and 100 on the index. The Pages collection in Agencia has no pagination. **Recommendation: v1 index lists up to 10 most recent posts (no pagination); category/tag pages get `?page=N` via standard query param.** Confirm.

6. **Search?** The reference has a 435-line Fuse.js component. **Recommendation: defer to v2.** v1 only filters by category/tag (server-side via the REST API).

7. **Revalidation strategy?** Three options:
   - (a) **Webhook to a per-tenant HTTP endpoint** that revalidates the Next.js page cache. Most responsive; requires deploy hook config per client.
   - (b) **ISR-only** with `next: { revalidate: 60 }` (already used in Pages). Simple, but up to 60s stale.
   - (c) **On-demand Astro redeploy** via Vercel/Netlify build hook from `afterChange`. Same as the reference does.

   **Recommendation: (b) for v1 (already in place); (a) or (c) optional as a follow-up.** Confirm.

8. **Post → Block content vs. plain Lexical?** The reference embeds Payload **blocks** (Banner, MediaBlock) inside the Lexical content via `BlocksFeature`. Agencia has its own block system (Hero/Text/Image/Contact/Menu/Product/Cart/Course) used in Pages. **Recommendation: keep Posts.content as plain Lexical only (text + headings + links + lists).** Don't add `BlocksFeature`. Confirm.

9. **Should Posts and Categories/Tags live in their own admin group?** Reference uses `admin.group: 'Blog'`. Agencia currently has no `admin.group` set on Pages. **Recommendation: group Posts/Categories/Tags under "Blog" for super-admin clarity; groups are invisible to tenant-scoped admins anyway.** Optional.

10. **Image position / focal point on hero?** The reference has a `select('top'|'center'|'bottom')` for `imagePosition`. This is Tailwind-coupled in the PostCard. **Recommendation: skip `imagePosition` in v1; use `object-fit: cover` + `object-position: center` in CSS. Defer focal-point UI to a future iteration.** Confirm.

---

## 5. Risks

- **Multi-tenant slug collisions.** Posts' `slug` field is not unique-by-default in the reference. In Agencia, two tenants can have `/blog/hello-world` simultaneously. The current `Pages` collection uses `validateUniqueSlug` hook (see `agencia-backend/src/collections/Pages/hooks/validateUniqueSlug.ts`) — Posts must do the same with **a scope that includes `tenant`** so uniqueness is per-tenant, not global. **Without this, the second tenant to publish a post with a duplicate slug will silently overwrite routing.**

- **N+1 on author listing.** `populateAuthors` does a `findByID` per author on every read. The reference's Posts has at most a few authors per post, so it's fine. If `authors` is included in v1, the agency design typically has 1 author per tenant — still fine. But if `authors` is included and a post has many authors, list view will explode. **Mitigation: drop `authors` in v1, or replace `populateAuthors` with a virtual field or join field.**

- **`defaultPopulate` depth.** Setting `defaultPopulate: { categories: true }` only populates the **IDs**, not the full Category document. The reference uses `depth: 2` explicitly when fetching lists, so admin list view shows the relationship but doesn't traverse into `category.title`. The same in Agencia: `depth: 2` for list endpoints, `depth: 1` for detail.

- **Template CSS isolation.** PostCard and Post components will be in the **client project** (each client is a separate repo), not the central backend. The CSS must be **per-project** (Vanilla CSS / CSS Modules), and the component file must live in the starter, not in `agencia-backend/`. The `sync:client` script allowlist does not currently include `src/components/blocks/blog/` — this needs to be extended if blog components are added to the template. (See the Sync flow documented in `agencia/AGENTS.md` under "Template → Client Sync".)

- **Revalidation across tenants.** A super-admin who edits a post in Tenant A's admin should NOT trigger a revalidation of Tenant B's frontend. The webhook (if we go that route) must include the tenant ID and only hit that tenant's frontend revalidation endpoint.

- **Astro `getStaticPaths` rebuild cost.** A tenant with 1000 posts will require 1000+ static pages on every rebuild. The reference relies on a full Astro rebuild (Astro has no ISR). For high-volume tenants, this is a perf risk. **Mitigation: cap the number of static paths generated and fall back to SSR for overflow (Astro supports hybrid output via `export const prerender = false` on a per-page basis).** Or use SSR with `cache: 'no-store'` for the first iteration and revisit later.

- **No test runner for v1.** Per `openspec/config.yaml`: `strict_tdd: false` and `coverage_threshold: 0`. The reference's `trackChanges` hook test won't apply. **Mitigation: spec phase should explicitly decide which (if any) tests to add — recommend at least access-control integration tests since they touch multi-tenant boundaries.**

- **`@payloadcms/plugin-seo` is not installed in Agencia.** If the spec decides to adopt it for Posts, that's a dependency add and admin UI change. Recommend **not** adopting it for v1 — use the same hand-rolled `meta.title/description/image` pattern as Pages.

- **No `Settings` global in Agencia.** The reference's `afterChange/afterDelete` hooks in Categories and Tags depend on a `Settings.lastContentChange` global. That global does not exist in Agencia and is not needed; **drop these hooks from the imported pattern.**

---

## 6. Recommendation for Scope

### v1 (this change)

**Backend (`agencia-backend/`)**

- New collection `Posts` with: `title`, `heroImage` (upload→media), `imagePosition` (drop — use CSS), `content` (richText, Lexical with HeadingFeature + LinkFeature only — no BlocksFeature), `publishedAt` (with auto-fill on publish), `meta` (title, description, image — hand-rolled like Pages), `slug` (Payload's built-in `slugField` + super-admin-only visibility + auto-generate on tenant-admin/editor), `tenant` (auto-injected by plugin). Skip: `authors`, `populatedAuthors`, `relatedPosts`.
- New collection `Categories` with: `title`, `slug`, `tenant` (auto).
- New collection `Tags` with: `title`, `slug`, `tenant` (auto).
- Register all three in `plugins/index.ts` `collections: { ..., posts: {}, categories: {}, tags: {} }`.
- Add a `/api/posts/preview-post` custom endpoint mirroring `Pages.ts` 153–198 (secret + tenantSlug + slug).
- Add access helpers in `agencia-backend/src/access/`:
  - `postReadAccess` — tenant-scoped + `_status: published` for anon; tenant-scoped only for authed.
  - `postWriteAccess` — super-admin all; tenant-admin/editor in own tenant.
  - Same for Categories and Tags.
- Add `validateUniqueSlug` per-tenant hook for Posts (clone `Pages/hooks/validateUniqueSlug.ts` and scope by tenant).
- Drafts + autosave (500ms) + schedulePublish enabled (match Pages).
- Live preview URL via `admin.preview.url` that resolves tenant's frontend base URL (reuse the `resolvePreviewBaseUrl` pattern from `Pages.ts` 29–73).
- One new shared frontend helper per starter: `getPostBySlug`, `getAllPosts`, `getAllCategories`, `getAllTags`, `getPostsByCategory`, `getPostsByTag` — all adding `where[tenant.slug][equals]=${TENANT_SLUG}`.
- A `/blog` index page, `/blog/post/[slug]` detail page, `/blog/category/[slug]` and `/blog/tag/[slug]` filter pages in **both** `astro-starter/src/pages/blog/` and `nextjs-starter/src/app/blog/`.
- New components `PostCard.astro` / `PostCard.tsx` and `Post.astro` / `Post.tsx` in each starter (vanilla CSS / CSS Modules — no Tailwind).
- Extend `astro-starter/src/lib/lexical.ts` and `nextjs-starter/src/lib/lexical.ts` if they don't yet cover headings + links (they do, per the existing file).
- Extend `BlockRenderer.astro` / `BlockRenderer.tsx` is **not needed** — Posts are a separate content shape, not a Page layout.
- Extend the `sync:client` allowlist to include the new blog pages and components (otherwise template changes won't reach existing clients).

### v1 — out of scope (defer)

- Comments collection + endpoint + Turnstile + moderation UI.
- `authors` / `populatedAuthors` field on Posts.
- `relatedPosts` field.
- `imagePosition` select (use CSS `object-position` instead).
- Search (Fuse.js or similar).
- Inline blocks inside `Posts.content` (BlocksFeature).
- `revalidatePath`/ISR webhook (rely on existing `next: { revalidate: 60 }` + Astro build-on-deploy).
- `@payloadcms/plugin-seo` plugin adoption (use Pages-style hand-rolled meta).

### v1 — design decision left to user

The five numbered questions in §4 (Comments, drafts/preview, Categories+Tags, Authors, Pagination) need a yes/no from the user. The defaults in §4 are the ones I'd recommend; the user can override any of them in the proposal phase.

### Estimated PR shape (for sdd-tasks to refine)

Per the SDD Phase workload guard (sdd-phase-common.md §E, 400-line budget):

- **PR 1: backend collections** — `Posts`, `Categories`, `Tags` + plugin registration + access helpers + slug hook + preview endpoint. (~400 lines of new code; within budget.)
- **PR 2: astro starter** — `src/lib/payload.ts` blog helpers + 4 pages + PostCard + Post + CSS. (~500-700 lines; consider chained PRs.)
- **PR 3: nextjs starter** — equivalent of PR 2 for Next.js. (~500-700 lines; consider chained PRs.)
- **PR 4: sync:client allowlist update** — small change to `agencia-backend/scripts/sync-template.ts` and `update-deps.ts` so the blog pages and components flow to existing clients. (~50 lines.)

Forecast: **400-line budget risk: Medium** for PR 2 and PR 3 individually. Recommend chained PRs.

---

## 7. File / Pattern Index (for sdd-propose to cite)

| Pattern                             | Reference path                                                                                     | Lines  |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- | ------ |
| Posts schema                        | `educarSano/backend/src/collections/Posts/Posts.ts`                                                | 1–245  |
| Posts defaultPopulate               | same                                                                                               | 33–41  |
| Posts access (template)             | same                                                                                               | 42–47  |
| Posts Lexical features              | same                                                                                               | 91–103 |
| Posts SEO tab                       | same                                                                                               | 150–172 |
| Posts publishedAt auto-fill         | same                                                                                               | 184–193 |
| Posts populateAuthors hook          | `educarSano/backend/src/collections/Posts/hooks/populateAuthors.ts`                                | 1–33   |
| Posts revalidatePost hook           | `educarSano/backend/src/collections/Posts/hooks/revalidatePost.ts`                                 | 1–44   |
| Categories schema                   | `educarSano/backend/src/collections/Categories.ts`                                                 | 1–32   |
| Tags schema                         | `educarSano/backend/src/collections/Tags.ts`                                                       | 1–35   |
| Comments (deferred)                 | `educarSano/backend/src/collections/Comments/Comments.ts`                                          | 1–215  |
| submitComment endpoint (deferred)   | `educarSano/backend/src/endpoints/submitComment.ts`                                                | 1–264  |
| trackChanges hook (NOT portable)    | `educarSano/backend/src/hooks/trackChanges.ts`                                                     | 1–50   |
| populatePublishedAt (reference has) | `educarSano/backend/src/hooks/populatePublishedAt.ts`                                              | 1–15   |
| assignCreatedBy (defer)             | `educarSano/backend/src/hooks/assignCreatedBy.ts`                                                   | 1–8    |
| slugField helper (NOT portable)     | `educarSano/backend/src/fields/slug/index.ts`                                                      | 1–68   |
| access.ts (reference)               | `educarSano/backend/src/access/index.ts`                                                           | 1–83   |
| Frontend getAllPosts                | `educarSano/frontend/src/lib/getAllPosts.ts`                                                       | 1–38   |
| Frontend getPostBySlug              | `educarSano/frontend/src/lib/getPostBySlug.ts`                                                     | 1–38   |
| Frontend getPostsByCategory         | `educarSano/frontend/src/lib/getPostsByCategory.ts`                                                | 1–56   |
| Frontend getPostByTag               | `educarSano/frontend/src/lib/getPostByTag.ts`                                                      | 1–49   |
| Frontend getAllCategories           | `educarSano/frontend/src/lib/getAllCategories.ts`                                                  | 1–31   |
| Frontend getAllTags                 | `educarSano/frontend/src/lib/getAllTags.ts`                                                        | 1–31   |
| Frontend blog index page            | `educarSano/frontend/src/pages/blog/index.astro`                                                   | 1–68   |
| Frontend post detail                | `educarSano/frontend/src/pages/blog/post/[slug].astro`                                             | 1–62   |
| Frontend category pages             | `educarSano/frontend/src/pages/blog/category/[slug]/index.astro` + `page/[page].astro`              | —      |
| Frontend tag pages                  | `educarSano/frontend/src/pages/blog/tag/[slug]/index.astro` + `page/[page].astro`                  | —      |
| Frontend PostCard (Tailwind)        | `educarSano/frontend/src/components/PostCard/PostCard.astro`                                       | 1–243  |
| Frontend Post detail (Tailwind)     | `educarSano/frontend/src/components/Post/Post.astro`                                               | 1–149  |
| Frontend RichText serializer        | `educarSano/frontend/src/components/RichText/RichText.astro`                                       | 1–248  |
| Frontend PaginationStatic           | `educarSano/frontend/src/components/Pagination/PaginationStatic.astro`                             | 1–134  |
| Frontend SearchAndFilter (defer)    | `educarSano/frontend/src/components/SearchAndFilter/SearchAndFilter.tsx`                           | 1–435  |
| Frontend CommentSection (defer)     | `educarSano/frontend/src/components/CommentSection/CommentSection.tsx`                             | 1–486  |
| **Agencia current**                 |                                                                                                    |        |
| Plugins config                      | `agencia/agencia-backend/src/plugins/index.ts`                                                     | 1–31   |
| Pages collection (template)         | `agencia/agencia-backend/src/collections/Pages.ts`                                                 | 1–302  |
| Pages preview endpoint              | same                                                                                               | 133–199 |
| Pages generateSlug hook             | `agencia/agencia-backend/src/collections/Pages/hooks/generateSlug.ts`                              | 1–53   |
| Pages validateUniqueSlug hook       | `agencia/agencia-backend/src/collections/Pages/hooks/validateUniqueSlug.ts`                        | —      |
| access/tenantAccess.ts              | `agencia/agencia-backend/src/access/tenantAccess.ts`                                               | 1–29   |
| access/anyone.ts                    | `agencia/agencia-backend/src/access/anyone.ts`                                                     | 1–3    |
| access/authenticatedOrPublished.ts  | `agencia/agencia-backend/src/access/authenticatedOrPublished.ts`                                   | 1–6    |
| resolveTenantIds util               | `agencia/agencia-backend/src/utilities/resolveTenantIds.ts`                                        | 1–27   |
| Media collection                    | `agencia/agencia-backend/src/collections/Media.ts`                                                 | 1–52   |
| Users collection                    | `agencia/agencia-backend/src/collections/Users.ts`                                                 | 1–179  |
| Astro starter payload.ts            | `agencia/astro-starter/src/lib/payload.ts`                                                         | 1–163  |
| Astro starter types.ts              | `agencia/astro-starter/src/lib/types.ts`                                                           | 1–158  |
| Astro starter lexical.ts            | `agencia/astro-starter/src/lib/lexical.ts`                                                         | 1–80   |
| Astro starter [slug].astro          | `agencia/astro-starter/src/pages/[slug].astro`                                                     | 1–25   |
| Astro starter BlockRenderer         | `agencia/astro-starter/src/components/BlockRenderer.astro`                                         | 1–43   |
| Next.js starter payload.ts          | `agencia/nextjs-starter/src/lib/payload.ts`                                                        | 1–245  |
| payload.config.ts                   | `agencia/agencia-backend/src/payload.config.ts`                                                    | 1–79   |
| openspec config (test rules etc.)   | `agencia/openspec/config.yaml`                                                                     | 1–53   |
| multi-tenant-setup spec             | `agencia/openspec/specs/multi-tenant-setup/spec.md`                                                | —      |

---

## 8. Ready for Proposal?

**Yes — with the open questions in §4 answered by the user.** Recommend `add-blog` as the change name. Recommend `sdd-propose` as the next phase, with `sdd-spec` immediately after to lock down the v1 vs v2 split.

If the user accepts the defaults in §4, the proposal can be written without further questions. If any of the §4 answers diverge from the recommendations, the proposal and spec both need to be adjusted.
