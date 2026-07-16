# Tasks: Add Blog (Posts, Categories, Tags)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1560 (all PRs combined) |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (backend, 390 lines) → PR 2 (astro, 570 lines) → PR 3 (nextjs, 570 lines) → PR 4 (sync, 10 lines) |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend: collections, hooks, plugin, config | PR 1 | All backend work. Both starters depend on this. |
| 2 | Astro starter: lib + blog pages + components | PR 2 | Independent from PR 3. Requires PR 1 for testing. |
| 3 | Next.js starter: lib + blog pages + components | PR 3 | Independent from PR 2. Requires PR 1 for testing. |
| 4 | sync:client allowlist extension | PR 4 | Trivial follow-up. Can merge last. |

---

## PR 1 — `feat(blog): add Posts, Categories, Tags collections with multi-tenant support`

**Work-units**: T-1, T-2, T-3
**Estimated diff**: ~390 lines
**Review focus**: Access control patterns (mirrors Pages), per-tenant slug uniqueness hook, preview endpoint contract.
**Verification**: `pnpm typecheck && pnpm lint`. Start dev server, confirm Posts/Categories/Tags appear in admin sidebar. Create a draft post, verify autosave, preview endpoint returns draft with correct secret.

### [x] T-1: Add validateUniqueSlug factory, Categories, and Tags collections

- **Files**:
  - `agencia-backend/src/utilities/validateUniqueSlug.ts` (create, ~50 lines)
  - `agencia-backend/src/collections/Categories/Categories.ts` (create, ~55 lines)
  - `agencia-backend/src/collections/Tags/Tags.ts` (create, ~55 lines)
- **Depends on**: —
- **Spec refs**: REQ-blog-taxonomy (Categories, Tags, access, per-tenant slug uniqueness, delete behavior)
- **Estimate**: ~160 lines

### [x] T-2: Add Posts collection with hooks and preview endpoint

- **Files**:
  - `agencia-backend/src/collections/Posts/Posts.ts` (create, ~200 lines)
  - `agencia-backend/src/collections/Posts/hooks/generateSlug.ts` (create, ~55 lines)
- **Depends on**: T-1 (uses `validateUniqueSlug` factory)
- **Spec refs**: REQ-blog-posts (schema, draft workflow, access control, slug uniqueness, preview endpoint, defaultPopulate)
- **Estimate**: ~255 lines

### [x] T-3: Register blog collections in plugin config and payload.config

- **Files**:
  - `agencia-backend/src/plugins/index.ts` (modify, +3 lines)
  - `agencia-backend/src/payload.config.ts` (modify, +5 lines)
- **Depends on**: T-2 (Posts must exist to import)
- **Spec refs**: REQ-multi-tenant-setup (plugin map), REQ-blog-posts (collection registration)
- **Estimate**: ~8 lines

---

## PR 2 — `feat(blog): add blog rendering to astro-starter`

**Work-units**: T-4, T-5, T-6, T-7
**Estimated diff**: ~570 lines
**Review focus**: Tenant filtering in every Payload query, PostCard/Post CSS Modules (no Tailwind), `getStaticPaths` 200-cap behavior.
**Verification**: Start Astro dev server with Payload running. Visit `/blog` — confirm 10 post cards render. Open a post detail — confirm Lexical body, hero image, taxonomy badges. Filter by category and tag. Verify 404 for unpublished slugs.

### [x] T-4: Add blog types and helpers to astro-starter lib

- **Files**:
  - `astro-starter/src/lib/types.ts` (modify, +25 lines: Post, Category, Tag interfaces)
  - `astro-starter/src/lib/payload.ts` (modify, +120 lines: getLatestPosts, getPostBySlug, getCategories, getTags, getPostsByCategory, getPostsByTag, getPostBySlugDraft)
  - `astro-starter/src/lib/lexical.ts` (modify, +3 lines: horizontalrule branch)
- **Depends on**: T-3 (backend must be running for query shape to be valid)
- **Spec refs**: REQ-blog-frontend-rendering (tenant filtering, pagination, Lexical rendering, SEO)
- **Estimate**: ~148 lines

### [x] T-5: Add blog index and post detail pages to astro-starter

- **Files**:
  - `astro-starter/src/pages/blog/index.astro` (create, ~45 lines)
  - `astro-starter/src/pages/blog/post/[slug].astro` (create, ~70 lines)
- **Depends on**: T-4 (uses helpers and types)
- **Spec refs**: REQ-blog-frontend-rendering (routes, SEO rendering, high-volume cap at 200)
- **Estimate**: ~115 lines

### [x] T-6: Add category and tag filter pages to astro-starter

- **Files**:
  - `astro-starter/src/pages/blog/category/[slug]/index.astro` (create, ~55 lines)
  - `astro-starter/src/pages/blog/tag/[slug]/index.astro` (create, ~55 lines)
- **Depends on**: T-4 (uses helpers and types)
- **Spec refs**: REQ-blog-frontend-rendering (routes, pagination with `?page=N`)
- **Estimate**: ~110 lines

### [x] T-7: Add PostCard and Post components with CSS Modules to astro-starter

- **Files**:
  - `astro-starter/src/components/blog/PostCard.astro` (create, ~60 lines)
  - `astro-starter/src/components/blog/PostCard.module.css` (create, ~50 lines)
  - `astro-starter/src/components/blog/Post.astro` (create, ~70 lines)
  - `astro-starter/src/components/blog/Post.module.css` (create, ~60 lines)
- **Depends on**: T-4 (uses types), T-5 (consumed by blog pages)
- **Spec refs**: REQ-blog-frontend-rendering (PostCard, Post, Lexical → HTML, CSS Modules)
- **Estimate**: ~240 lines

---

## PR 3 — `feat(blog): add blog rendering to nextjs-starter`

**Work-units**: T-8, T-9, T-10, T-11
**Estimated diff**: ~570 lines
**Review focus**: Same as PR 2 but for Next.js. `revalidate: 60` ISR, `generateStaticParams`, React component patterns.
**Verification**: Start Next.js dev server with Payload running. Same smoke test as PR 2: `/blog`, detail, category, tag, 404 for drafts.

### [x] T-8: Add blog types and helpers to nextjs-starter lib

- **Files**:
  - `nextjs-starter/src/lib/types.ts` (modify, +25 lines: Post, Category, Tag interfaces)
  - `nextjs-starter/src/lib/payload.ts` (modify, +120 lines: same 7 helpers as astro, with `next: { revalidate: 60 }`)
  - `nextjs-starter/src/lib/lexical.ts` (modify, +3 lines: horizontalrule branch)
- **Depends on**: T-3 (backend must be running)
- **Spec refs**: REQ-blog-frontend-rendering (tenant filtering, pagination, Lexical rendering, SEO, ISR revalidation)
- **Estimate**: ~148 lines

### [x] T-9: Add blog index and post detail pages to nextjs-starter

- **Files**:
  - `nextjs-starter/src/app/blog/page.tsx` (create, ~50 lines)
  - `nextjs-starter/src/app/blog/post/[slug]/page.tsx` (create, ~80 lines)
- **Depends on**: T-8 (uses helpers and types)
- **Spec refs**: REQ-blog-frontend-rendering (routes, `generateStaticParams`, SEO meta tags, ISR)
- **Estimate**: ~130 lines

### [x] T-10: Add category and tag filter pages to nextjs-starter

- **Files**:
  - `nextjs-starter/src/app/blog/category/[slug]/page.tsx` (create, ~55 lines)
  - `nextjs-starter/src/app/blog/tag/[slug]/page.tsx` (create, ~55 lines)
- **Depends on**: T-8 (uses helpers and types)
- **Spec refs**: REQ-blog-frontend-rendering (routes, pagination with `searchParams.page`)
- **Estimate**: ~110 lines

### [x] T-11: Add PostCard and Post React components with CSS Modules to nextjs-starter

- **Files**:
  - `nextjs-starter/src/components/blog/PostCard.tsx` (create, ~55 lines)
  - `nextjs-starter/src/components/blog/PostCard.module.css` (create, ~50 lines)
  - `nextjs-starter/src/components/blog/Post.tsx` (create, ~65 lines)
  - `nextjs-starter/src/components/blog/Post.module.css` (create, ~60 lines)
- **Depends on**: T-8 (uses types), T-9 (consumed by blog pages)
- **Spec refs**: REQ-blog-frontend-rendering (PostCard, Post, Lexical → HTML, CSS Modules)
- **Estimate**: ~230 lines

---

## PR 4 — `chore(blog): extend sync:client allowlist for blog pages and components`

**Work-units**: T-12
**Estimated diff**: ~10 lines
**Review focus**: New allowlist entries match the files created in PR 2 and PR 3.
**Verification**: Run `pnpm sync:client --slug=<existing-client> --verbose` — confirm blog files appear in the diff output.

### [x] T-12: Extend sync:client allowlist with blog pages and components

- **Files**:
  - `agencia-backend/scripts/sync-template.ts` (modify, +8 lines)
- **Depends on**: T-7, T-11 (files must exist in starters)
- **Spec refs**: REQ-blog-frontend-rendering (template → client sync)
- **Estimate**: ~10 lines

---

## Dependency Graph

```
T-1 (factory + Categories + Tags)
 └─> T-2 (Posts collection + hooks + endpoint)
      └─> T-3 (plugin + payload.config)
           ├─> T-4 (astro lib) ─> T-5 (astro blog pages)
           │                   ─> T-6 (astro filter pages)
           │                   ─> T-7 (astro components)
           ├─> T-8 (nextjs lib) ─> T-9 (nextjs blog pages)
           │                    ─> T-10 (nextjs filter pages)
           │                    ─> T-11 (nextjs components)
           └─> T-12 (sync allowlist) [also depends on T-7, T-11]
```

T-4 through T-7 (astro) and T-8 through T-11 (nextjs) are independent tracks. They can run in parallel after T-3 completes.

## Out of Scope (v1)

- Comments collection, Turnstile, moderation UI
- `authors` / `populatedAuthors` field on Posts
- `relatedPosts` relationship field
- `imagePosition` focal point select (use CSS `object-position`)
- Full-text search (Fuse.js or similar)
- Inline blocks inside `Posts.content` (BlocksFeature)
- Webhook-based revalidation (rely on ISR `revalidate: 60` + Astro build-on-deploy)
- `@payloadcms/plugin-seo` adoption (use Pages-style hand-rolled meta)
- 301 redirects on slug change
- Custom pagination UI (`?page=N` only)
- Share buttons

## Hand-off Note for sdd-apply

**Execution order**: T-1 → T-2 → T-3 → then T-4..T-7 (astro) and T-8..T-11 (nextjs) in parallel → T-12 last.

**Parallelizable batches**: PR 2 (astro) and PR 3 (nextjs) have zero cross-dependencies. After T-3 lands, two agents can work on them simultaneously.

**Cross-batch contracts**: The Payload REST query shape defined in the design (§9) is the contract between backend and frontends. The preview endpoint's `GET /api/posts/preview-post?secret=X&tenantSlug=Y&slug=Z` must match what `getPostBySlugDraft()` calls in each starter. The `Post`, `Category`, `Tag` TypeScript interfaces in both starters' `types.ts` must be identical.

**Commit style**: Conventional Commits in English. No AI attribution. Example: `feat(blog): add Posts collection with draft workflow and preview endpoint`.
