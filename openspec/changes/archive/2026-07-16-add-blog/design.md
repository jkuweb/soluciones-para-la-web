# Design: Add Blog (Posts, Categories, Tags)

## 1. Goals & Non-Goals Recap

**Goal**: Add three multi-tenant Payload collections (`Posts`, `Categories`, `Tags`) scoped via `@payloadcms/plugin-multi-tenant`, with draft workflow, per-tenant slug uniqueness, preview endpoint, and shared frontend rendering helpers in both starter templates. A tenant-admin creates a Post end-to-end — title, hero, Lexical body, taxonomy, SEO meta, preview, publish — without developer intervention.

**Non-goals**: Comments, multi-author, related posts, inline blocks in post body, image focal point UI, webhook revalidation, full-text search, custom pagination UI, Tailwind, `@payloadcms/plugin-seo` adoption. All deferred to v2 or explicitly dropped.

## 2. Architecture Decisions

### Decision 1: File layout mirrors Pages

**Choice**: `src/collections/Posts/Posts.ts` (inline preview endpoint, tabs, hooks), `src/collections/Categories/Categories.ts`, `src/collections/Tags/Tags.ts`.
**Alternatives considered**: Flat files (`src/collections/Posts.ts`) or a `blog/` subdirectory.
**Rationale**: Pages already uses `Posts.ts` + `hooks/` subdirectory; matching it keeps discoverability consistent. No benefit to a `blog/` grouping — the admin sidebar groups collections visually.

### Decision 2: Multi-tenant plugin registration in `plugins/index.ts`

**Choice**: Add `posts: {}, categories: {}, tags: {}` to the existing `collections` map alongside `pages`, `media`, `header`, `footer`.
**Alternatives considered**: Separate plugin instance, conditional registration per tenant type.
**Rationale**: Same shape of change as Header/Footer. The plugin auto-injects the `tenant` field and wraps access control with no additional config needed. One-line-per-collection diff.

### Decision 3: Shared `validateUniqueSlug` factory over per-collection clones

**Choice**: Extract to `src/utilities/validateUniqueSlug.ts` as a factory `validateUniqueSlug(collectionSlug: string): CollectionBeforeChangeHook`. Posts, Categories, and Tags consume it. Pages stays as-is (not refactored in this change).
**Alternatives considered**: Clone Pages' hook three times (one per collection).
**Rationale**: With 4 collections (Pages + 3 new) needing the same per-tenant uniqueness logic, a factory saves ~125 lines of duplicated code. The parameter is a single string — complexity is negligible. Pages is left alone to avoid churn on an unrelated collection.

### Decision 4: Preview endpoint inline in `Posts.ts`

**Choice**: Define the `/preview-post` endpoint inline inside `Posts.ts` (same pattern as Pages.ts lines 133–198).
**Alternatives considered**: Separate file `src/endpoints/preview-post.ts`.
**Rationale**: Pages already uses inline endpoints. A separate file breaks the co-location convention and adds import indirection for ~50 lines of handler. If every collection grows its own preview endpoint, a shared factory can be extracted later — but with only two collections (Pages, Posts), the inline pattern is fine.

### Decision 5: Posts-specific Lexical editor config

**Choice**: Define the editor inline on the `content` richText field in `Posts.ts`, not at the top-level `payload.config.ts`.
**Rationale**: The top-level `editor: lexicalEditor()` is the default for all collections. Pages uses it as-is. Posts needs a restricted feature set (no BlocksFeature). Overriding per-field is the standard Payload pattern — each collection controls its own editor.

## 3. File Structure

### agencia-backend (Payload)

| File | Action | Purpose |
|------|--------|---------|
| `src/collections/Posts/Posts.ts` | Create | Collection config: fields, tabs (Content / Taxonomy / SEO), draft versions, autosave 500ms, access control, inline `/preview-post` endpoint, defaultPopulate, admin.group `'Blog'` |
| `src/collections/Categories/Categories.ts` | Create | Collection config: `title` (text, required), `slug` (slugField, disableUnique, condition-hidden from non-super-admin), `admin.group: 'Blog'`, tenant-scoped access |
| `src/collections/Tags/Tags.ts` | Create | Same shape as Categories |
| `src/utilities/validateUniqueSlug.ts` | Create | Factory: `validateUniqueSlug(collectionSlug: string) → CollectionBeforeChangeHook`. Queries for existing doc where `slug + tenant` match, excludes self on update |
| `src/collections/Pages/hooks/generateSlug.ts` | Copy-pattern | Posts needs its own `generateSlug` hook (same logic, different fallback title: `'New Post YYYY-MM-DD'`) |
| `src/plugins/index.ts` | Modify | Add `posts: {}, categories: {}, tags: {}` to `collections` map |
| `src/payload.config.ts` | Modify | Import and register `Posts`, `Categories`, `Tags` in the `collections` array |

### astro-starter

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/blog/index.astro` | Create | Blog listing: latest 10 posts via `getLatestPosts({ limit: 10 })`, renders `PostCard` grid |
| `src/pages/blog/post/[slug].astro` | Create | Post detail: `getPostBySlug(params.slug)`, renders `Post` component. `getStaticPaths` caps at 200; overflow SSR via hybrid mode |
| `src/pages/blog/category/[slug]/index.astro` | Create | Category filter: `getPostsByCategory(params.slug, page)`, renders `PostCard` list with `?page=N` pager |
| `src/pages/blog/tag/[slug]/index.astro` | Create | Tag filter: same pattern as category |
| `src/components/blog/PostCard.astro` | Create | Card: hero image (`media.sizes.card`), title, date, category badges, link to `/blog/post/[slug]` |
| `src/components/blog/Post.astro` | Create | Full detail: hero image, title, date, taxonomy badges, Lexical body via `serializeLexical`, SEO meta |
| `src/lib/payload.ts` | Modify | Add: `getLatestPosts`, `getPostBySlug`, `getCategories`, `getTags`, `getPostsByCategory`, `getPostsByTag`, `getPostBySlugDraft` |
| `src/lib/types.ts` | Modify | Add: `Post`, `Category`, `Tag` interfaces |
| `src/lib/lexical.ts` | Modify | Add `horizontalrule` → `<hr />` branch |

### nextjs-starter

| File | Action | Purpose |
|------|--------|---------|
| `src/app/blog/page.tsx` | Create | Blog listing with `revalidate: 60` ISR |
| `src/app/blog/post/[slug]/page.tsx` | Create | Post detail with `generateStaticParams` + `revalidate: 60` |
| `src/app/blog/category/[slug]/page.tsx` | Create | Category filter |
| `src/app/blog/tag/[slug]/page.tsx` | Create | Tag filter |
| `src/components/blog/PostCard.tsx` | Create | Card component (React) |
| `src/components/blog/Post.tsx` | Create | Detail component (React) |
| `src/lib/payload.ts` | Modify | Add blog query helpers (same API as Astro) |
| `src/lib/types.ts` | Modify | Add `Post`, `Category`, `Tag` interfaces |
| `src/lib/lexical.ts` | Modify | Add `horizontalrule` → `<hr />` branch |

## 4. Open Question Resolutions

### Q1: Lexical Feature Set

**Decision**: `rootFeatures` (paragraph, text formatting, lists, quotes) + `HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] })` + `LinkFeature` + `HorizontalRuleFeature` + `FixedToolbarFeature` + `InlineToolbarFeature`. No `BlocksFeature`, no `UploadFeature`, no h1 (the post title is the semantic h1). This mirrors the proposal: text-only rich text matching the existing `serializeLexical` renderer's capabilities plus `horizontalrule`.

### Q2: Admin Tab Layout

**Decision**: **Content** (title, heroImage, content), **Taxonomy** (categories, tags), **SEO** (metaTitle, metaDescription, metaImage). Same three-tab pattern as Pages' Hero / Content / SEO. Taxonomy sits where Pages' layout blocks would be — the logical separation is: write the post (Content), classify it (Taxonomy), optimize it (SEO).

### Q3: Slug Visibility

**Decision**: Match Pages: hide slug from non-super-admin users via `admin.condition` on both the `slug` field and the `generateSlug` checkbox. Rationale: tenant-admins changing a published post's slug silently breaks URLs with no 301 in v1. Auto-generation from title via `generateSlug` hook (cloned from Pages) kicks in for non-super-admin users. Super-admins retain full control.

### Q4: Astro Overflow SSR Route

**Decision**: Single `[slug].astro` with `getStaticPaths` returning the first 200 slugs. No separate SSR file. Astro's `hybrid` output mode (already configured in `astro.config.mjs`) means any slug NOT in `getStaticPaths` automatically falls back to SSR at request time. No `export const prerender = false` needed — the absence from the static path list triggers SSR natively. Rationale: zero additional file, zero config change, documented Astro behavior.

### Q5: PostCard Component API

**Decision**: Props shape: `{ title: string, slug: string, publishedAt: string, heroImage: MediaImage, excerpt?: string, categories?: { id: string, title: string, slug: string }[] }`. The `MediaImage` type already exists in both starters' `types.ts` (with `sizes.thumbnail`, `sizes.card`, `sizes.hero`). The card uses `heroImage.sizes?.card?.url || heroImage.url` for the image. No `tags` on the card — tags are a detail-page concern; cards show category badges only for visual simplicity. This matches the existing starter pattern where shared types (`MediaImage`, `Link`) are defined once in `types.ts` and consumed across components.

## 5. Hook Signatures

### `validateUniqueSlug(collectionSlug)` — shared factory

```ts
// src/utilities/validateUniqueSlug.ts
import type { CollectionBeforeChangeHook, Where } from 'payload'
import { APIError } from 'payload'

export function validateUniqueSlug(collectionSlug: string): CollectionBeforeChangeHook {
  return async ({ data, originalDoc, operation, req }) => {
    if (!data) return
    const slug = data.slug as string | undefined
    if (!slug) return
    const tenant = (data.tenant ?? originalDoc?.tenant) as number | undefined
    if (!tenant) return

    const where: Where = {
      tenant: { equals: tenant },
      slug: { equals: slug },
    }
    if (operation === 'update' && originalDoc?.id) {
      where.id = { not_equals: originalDoc.id }
    }

    const existing = await req.payload.find({
      collection: collectionSlug,
      where,
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    if (existing.docs.length > 0) {
      throw new APIError(
        `A document with slug "${slug}" already exists for this tenant. Please choose a different slug.`,
        400,
      )
    }
  }
}
```

### `generateSlug` — cloned from Pages, adapted for Posts

```ts
// src/collections/Posts/hooks/generateSlug.ts
import type { CollectionBeforeValidateHook } from 'payload'

function slugify(value: string): string {
  return value.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-').replace(/^-+|-+$/g, '')
}

export const generateSlug: CollectionBeforeValidateHook = async ({ data, operation, req }) => {
  if (operation !== 'create' && operation !== 'update') return data
  if (!data) return data

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    data.title = `New Post ${new Date().toISOString().split('T')[0]}`
  }

  if (!req.user?.roles?.includes('super-admin')) {
    if (typeof data.title === 'string' && data.title.trim().length > 0) {
      data.slug = slugify(data.title)
    }
  }
  return data
}
```

### `populatePublishedAt` — field-level inline hook (Posts.ts)

```ts
// Inline on the publishedAt field definition, not a separate file
{
  name: 'publishedAt',
  type: 'date',
  admin: { date: { pickerAppearance: 'dayAndTime' }, position: 'sidebar' },
  hooks: {
    beforeChange: [
      ({ siblingData, value }) => {
        if (siblingData._status === 'published' && !value) {
          return new Date()
        }
        return value
      },
    ],
  },
}
```

## 6. Access Control Composition

### Posts

```ts
access: {
  read: ({ req: { user } }) => {
    if (user?.roles?.includes('super-admin')) return true
    if (user) {
      const tenantIds = resolveTenantIds(user)
      return { tenant: { in: tenantIds } }
    }
    return { _status: { equals: 'published' } }
  },
  create: ({ req: { user } }) =>
    user?.roles?.includes('super-admin') ?? false,
  update: ({ req: { user } }) => {
    if (user?.roles?.includes('super-admin')) return true
    const tenantIds = resolveTenantIds(user)
    return { tenant: { in: tenantIds } }
  },
  delete: ({ req: { user } }) =>
    user?.roles?.includes('super-admin') ?? false,
}
```

### Categories / Tags

```ts
access: {
  read: ({ req: { user } }) => {
    if (!user) return false
    if (user?.roles?.includes('super-admin')) return true
    const tenantIds = resolveTenantIds(user)
    return { tenant: { in: tenantIds } }
  },
  create: ({ req: { user } }) =>
    user?.roles?.includes('super-admin') ?? false,
  update: ({ req: { user } }) => {
    if (user?.roles?.includes('super-admin')) return true
    const tenantIds = resolveTenantIds(user)
    return { tenant: { in: tenantIds } }
  },
  delete: ({ req: { user } }) =>
    user?.roles?.includes('super-admin') ?? false,
}
```

`resolveTenantIds` is imported from `@/utilities/resolveTenantIds` (already exists). The `super-admin` role check mirrors Pages line 105. The anonymous-read for Posts returns `{ _status: { equals: 'published' } }` without a tenant constraint because the frontend always adds `where[tenant.slug][equals]=${TENANT_SLUG}` — the plugin does not add tenant constraints for unauthenticated requests since there's no user to derive a tenant from.

## 7. Endpoint Contract

### `GET /api/posts/preview-post`

**Query params**: `secret` (required, string), `tenantSlug` (required, string), `slug` (required, string)

**Handler** (inline in Posts.ts, mirroring Pages.ts lines 153–198):

```ts
{
  path: '/preview-post',
  method: 'get',
  handler: async (req) => {
    const expected = process.env.PREVIEW_SECRET
    const provided = req.query.secret
    if (!expected || provided !== expected) {
      return Response.json({ error: 'Invalid preview secret' }, { status: 403 })
    }

    const slug = typeof req.query.slug === 'string' ? req.query.slug : ''
    const tenantSlug = typeof req.query.tenantSlug === 'string' ? req.query.tenantSlug : ''
    if (!slug || !tenantSlug) {
      return Response.json({ error: 'Missing slug or tenantSlug' }, { status: 400 })
    }

    const result = await req.payload.find({
      collection: 'posts',
      draft: true,
      limit: 1,
      pagination: false,
      overrideAccess: true,
      depth: 2,
      where: {
        and: [
          { slug: { equals: slug } },
          { 'tenant.slug': { equals: tenantSlug } },
        ],
      },
    })

    const doc = result.docs?.[0] || null
    if (!doc) return Response.json({ error: 'Post not found' }, { status: 404 })
    return Response.json(doc)
  },
}
```

| Condition | HTTP Status | Body |
|-----------|-------------|------|
| Valid secret + existing slug | 200 | Full post document (draft) |
| Wrong/missing secret | 403 | `{ error: "Invalid preview secret" }` |
| Missing slug or tenantSlug | 400 | `{ error: "Missing slug or tenantSlug" }` |
| Post not found | 404 | `{ error: "Post not found" }` |

The starter preview route (`/preview?path=/blog/{slug}&secret=...`) calls `getPostBySlugDraft(slug, secret)` which hits this endpoint with `cache: 'no-store'`. No CORS changes needed — the endpoint runs on the same Payload server the starter already fetches from.

## 8. Multi-Tenant Plugin Delta

**File**: `src/plugins/index.ts` — change the `collections` map from:

```ts
collections: {
  pages: {},
  media: {},
  header: {},
  footer: {},
},
```

to:

```ts
collections: {
  pages: {},
  media: {},
  header: {},
  footer: {},
  posts: {},
  categories: {},
  tags: {},
},
```

No other plugin options change. `useUsersTenantFilter` stays `false`. The `tenantField` config stays as-is. The `userHasAccessToAllTenants` callback stays unchanged. All three new collections inherit the same auto-injected `tenant` field and admin list filtering.

## 9. Frontend Contracts

### Payload REST Query Strings

```
// getLatestPosts(tenant, limit = 10)
GET /api/posts?where[tenant.slug][equals]=${tenant}&where[_status][equals]=published&sort=-publishedAt&limit=${limit}&depth=2

// getPostBySlug(tenant, slug)
GET /api/posts?where[tenant.slug][equals]=${tenant}&where[slug][equals]=${slug}&depth=2&limit=1

// getCategories(tenant)
GET /api/categories?where[tenant.slug][equals]=${tenant}&sort=title&depth=0

// getTags(tenant)
GET /api/tags?where[tenant.slug][equals]=${tenant}&sort=title&depth=0

// getPostsByCategory(tenant, slug, page = 1, limit = 10)
GET /api/posts?where[tenant.slug][equals]=${tenant}&where[_status][equals]=published&where[categories.slug][equals]=${slug}&sort=-publishedAt&limit=${limit}&page=${page}&depth=2

// getPostsByTag(tenant, slug, page = 1, limit = 10)
GET /api/posts?where[tenant.slug][equals]=${tenant}&where[_status][equals]=published&where[tags.slug][equals]=${slug}&sort=-publishedAt&limit=${limit}&page=${page}&depth=2

// getPostBySlugDraft(tenant, slug, secret) — for preview routes
GET /api/posts/preview-post?slug=${slug}&tenantSlug=${tenant}&secret=${secret}
// cache: 'no-store' (Astro: { cache: 'no-store' }, Next.js: cache: 'no-store')
```

### TypeScript Types (added to both starters' `src/lib/types.ts`)

```ts
export interface Post {
  id: string
  slug: string
  title: string
  heroImage: MediaImage
  content: LexicalNode | { root: LexicalNode }
  categories?: { id: string; title: string; slug: string }[]
  tags?: { id: string; title: string; slug: string }[]
  publishedAt: string
  excerpt?: string
  metaTitle?: string
  metaDescription?: string
  metaImage?: MediaImage
}

export interface Category {
  id: string
  title: string
  slug: string
}

export interface Tag {
  id: string
  title: string
  slug: string
}
```

### PostCard Props

```ts
interface PostCardProps {
  title: string
  slug: string
  publishedAt: string
  heroImage: MediaImage
  excerpt?: string
  categories?: { id: string; title: string; slug: string }[]
}
```

### Post Detail Props

```ts
interface PostProps {
  title: string
  slug: string
  publishedAt: string
  heroImage: MediaImage
  content: LexicalNode | { root: LexicalNode }
  categories?: { id: string; title: string; slug: string }[]
  tags?: { id: string; title: string; slug: string }[]
  metaTitle?: string
  metaDescription?: string
  metaImage?: MediaImage
}
```

### Lexical → HTML Render Call

```ts
import { serializeLexical } from '@/lib/lexical'
const html = serializeLexical(post.content)  // returns HTML string
```

The existing `serializeLexical` already handles: root, paragraph, heading (any tag), list, listitem, link, quote, text formatting (bold, italic, underline, strikethrough, code), linebreak. One net-new branch needed in both starters:

```ts
// Add to serializeNode() in both astro-starter and nextjs-starter src/lib/lexical.ts:
if (node.type === 'horizontalrule') {
  return '<hr />'
}
```

## 10. Migration / Data Implications

This change is **purely additive**. No existing data migration is needed. Three new PostgreSQL tables are created via `pnpm payload migrate` (the plugin's `push: true` in `db: postgresAdapter` handles this automatically on next startup).

**Risk to existing tenants**: None. The multi-tenant plugin injects a `tenant` field on each new collection independently. Existing `pages`, `media`, `header`, `footer` collections are untouched. No existing access control functions change.

**No deprecation**: No existing utility, hook, or collection is modified or deprecated. The `validateUniqueSlug` factory is net-new; Pages' existing hook stays in place.

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Plugin startup error with extended collections map | Low | High — server won't start | The same shape of change (`header: {}, footer: {}`) already works. Test startup locally before deploying. |
| `serializeLexical` missing `horizontalrule` node | High | Low — `<hr>` doesn't render, rendering broken but not crashed | Add one `if` branch to both starters' `lexical.ts` before shipping frontend. |
| Tenant with >200 posts on Astro incurs SSR cost | Low | Medium — increased server load | Document the 200 cap. Monitor SSR request volume. If it becomes a problem, raise the cap or add a deploy-time warning. |
| `preventslug` leaking across tenants via the preview endpoint | Low | High — security breach | The preview endpoint queries by both `slug` AND `tenant.slug`. Cross-tenant preview is impossible without the matching tenant slug. |
| No automated tests for access boundaries | Medium | Medium — regression surface | Manual smoke testing: create tenant A post, attempt to read from tenant B. Tests added in a follow-up PR (blocked by no test runner). |

## 12. What the Tasks Phase Will Need

Tasks will be split into 3 batches covering ~28 files. **Batch 1** (backend): Posts, Categories, Tags collections, `validateUniqueSlug` factory, `generateSlug` hook, plugin config, `payload.config.ts` registrations, preview endpoint — ~8 files to create, 2 to modify. **Batch 2** (astro-starter): 4 blog pages, 2 components, 3 lib file modifications — ~9 files. **Batch 3** (nextjs-starter): same shape as batch 2. Batch 2 and 3 are independent and can run in parallel. All three batches depend on batch 1 for the backend to be running during frontend testing. The `sync:client` allowlist update is a trivial follow-up (~2 files, ~10 lines) included in batch 1 or a 4th mini-batch.
