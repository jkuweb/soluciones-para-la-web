# Payload SEO Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install `@payloadcms/plugin-seo` in the Payload admin panel on `pages` and `posts` collections, replacing the hand-rolled SEO fields with the official plugin's richer UI and consistent data shape.

**Architecture:** Register the plugin in `agencia-backend/src/plugins/index.ts` alongside the existing `multiTenantPlugin`. Auto-generation helpers (title/description/image) live in a separate `seo-helpers.ts` file so they can be unit-tested. The plugin uses `tabbedUI: true` so it auto-organises each enabled collection into "General" + "SEO" tabs. The hand-rolled SEO tabs in `Pages.ts` and `Posts.ts` are removed first to avoid the plugin's `meta` group colliding with the existing `meta` group on `pages`. Multi-tenant isolation is preserved because the plugin only adds fields inside the document — it doesn't touch the tenant field or the media isolation.

**Tech Stack:** Payload 3.85.1 (Next.js 16, React 19, PostgreSQL), TypeScript strict mode, Vitest 4 (integration + unit), pnpm 9–11.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `agencia-backend/package.json` | Add `@payloadcms/plugin-seo@3.85.1` dependency. |
| `agencia-backend/src/plugins/seo-helpers.ts` | Pure functions: `generateSeoTitle`, `generateSeoDescription`, `generateSeoImage`. Exported for unit tests. |
| `agencia-backend/src/plugins/index.ts` | Register `seoPlugin(...)` alongside `multiTenantPlugin(...)`, importing the helpers. |
| `agencia-backend/src/collections/Pages.ts` | Delete the hand-rolled SEO tab with `name: 'meta'` (lines 283–298). |
| `agencia-backend/src/collections/Posts/Posts.ts` | Delete the hand-rolled SEO tab (lines 207–230). Update `defaultPopulate` from `metaImage: true` to `meta: true`. |
| `agencia-backend/tests/unit/seo-helpers.spec.ts` | New unit tests for the three helper functions (no DB). |
| `agencia-backend/tests/int/seo-plugin.int.spec.ts` | New integration test verifying the `meta` group is injected by the plugin into pages+posts only. |

---

## Task 1: Install the SEO plugin dependency

**Files:**
- Modify: `agencia-backend/package.json`

- [ ] **Step 1: Run pnpm add in the backend workspace**

```bash
cd agencia-backend
pnpm add @payloadcms/plugin-seo@3.85.1
```

Expected: package.json updates with `@payloadcms/plugin-seo` pinned to `3.85.1` in `dependencies`. pnpm-lock.yaml also updates.

- [ ] **Step 2: Verify the dependency entry**

```bash
grep '"@payloadcms/plugin-seo"' agencia-backend/package.json
```

Expected: one line containing `"@payloadcms/plugin-seo": "3.85.1",`.

- [ ] **Step 3: Verify pnpm install was clean**

```bash
cd agencia-backend
pnpm install --frozen-lockfile
```

Expected: completes with no errors. The `--frozen-lockfile` flag confirms the lockfile and package.json are consistent.

- [ ] **Step 4: Commit**

```bash
git add agencia-backend/package.json agencia-backend/pnpm-lock.yaml
git commit -m "feat(seo): add @payloadcms/plugin-seo dependency"
```

---

## Task 2: Remove hand-rolled SEO tab from Pages

**Files:**
- Modify: `agencia-backend/src/collections/Pages.ts` (lines 283–298)

The tab uses `name: 'meta'`, which causes Payload to nest `title` and `description` under a top-level `meta` group on the document. The SEO plugin will add its own `meta` group — without this removal, Payload would throw a duplicate field name error at boot. **Must be done before the plugin is registered.**

- [ ] **Step 1: Delete the SEO tab**

In `agencia-backend/src/collections/Pages.ts`, remove the entire `SEO` tab block. The block to delete starts with `{` on line 283 (`{` after `label: 'Hero'`'s closing brace), `label: 'SEO'`, and ends with `},` on line 298.

Delete lines 283–298 inclusive (the tab object from `{` to `},`).

The remaining `tabs` array should now contain only the `Hero` and `Content` tabs.

- [ ] **Step 2: Verify the tabs structure**

```bash
cd agencia-backend
grep -n "label: 'Hero'\|label: 'Content'\|label: 'SEO'" src/collections/Pages.ts
```

Expected output (two matches only):

```
244:            label: 'Hero',
260:            label: 'Content',
```

No match for `label: 'SEO'`.

- [ ] **Step 3: Verify the file still compiles**

```bash
cd agencia-backend
pnpm typecheck
```

Expected: exits 0. No type errors.

- [ ] **Step 4: Commit**

```bash
git add agencia-backend/src/collections/Pages.ts
git commit -m "refactor(pages): remove hand-rolled SEO tab (replaced by SEO plugin)"
```

---

## Task 3: Remove hand-rolled SEO tab from Posts and update defaultPopulate

**Files:**
- Modify: `agencia-backend/src/collections/Posts/Posts.ts` (lines 207–230 for the tab; line 39 for `defaultPopulate`)

Posts uses flat field names (`metaTitle`, `metaDescription`, `metaImage`), not a nested `meta` group, so there's no duplicate-name risk here. But the plugin's auto-injected `meta` group supersedes these flat fields.

- [ ] **Step 1: Delete the SEO tab from Posts**

In `agencia-backend/src/collections/Posts/Posts.ts`, delete lines 207–230 inclusive (the `SEO` tab object from `{` to `},`).

The remaining `tabs` array in Posts should contain only `Content` and `Taxonomy`.

- [ ] **Step 2: Update defaultPopulate**

In the same file, replace the existing `defaultPopulate` block:

```ts
defaultPopulate: {
  title: true,
  slug: true,
  categories: true,
  metaImage: true,
},
```

with:

```ts
defaultPopulate: {
  title: true,
  slug: true,
  categories: true,
  meta: true,
},
```

(`metaImage` no longer exists as a field; `meta` populates the whole new group added by the plugin.)

- [ ] **Step 3: Verify no stale references**

```bash
cd agencia-backend
grep -n "metaTitle\|metaDescription\|metaImage" src/collections/Posts/Posts.ts
```

Expected: no matches. Every occurrence is removed.

- [ ] **Step 4: Verify the file still compiles**

```bash
cd agencia-backend
pnpm typecheck
```

Expected: exits 0. No type errors.

- [ ] **Step 5: Commit**

```bash
git add agencia-backend/src/collections/Posts/Posts.ts
git commit -m "refactor(posts): remove hand-rolled SEO tab and switch defaultPopulate to meta group"
```

---

## Task 4: Create seo-helpers.ts with TDD

**Files:**
- Create: `agencia-backend/src/plugins/seo-helpers.ts`
- Create: `agencia-backend/tests/unit/seo-helpers.spec.ts`

The three helper functions are pure — they take a `doc` and return a string or unknown. They live in a separate file so the unit tests don't need to boot Payload.

- [ ] **Step 1: Write the failing unit test**

Create `agencia-backend/tests/unit/seo-helpers.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  generateSeoTitle,
  generateSeoDescription,
  generateSeoImage,
} from '@/plugins/seo-helpers'

describe('generateSeoTitle', () => {
  it('appends the tenant name when tenant is populated', () => {
    const result = generateSeoTitle({
      doc: {
        title: 'About Us',
        tenant: { name: 'Acme Studio' },
      } as Record<string, unknown>,
    })
    expect(result).toBe('About Us | Acme Studio')
  })

  it('returns just the title when tenant is missing', () => {
    const result = generateSeoTitle({
      doc: { title: 'About Us' } as Record<string, unknown>,
    })
    expect(result).toBe('About Us')
  })

  it('returns just the title when tenant is an ID-only reference', () => {
    const result = generateSeoTitle({
      doc: { title: 'About Us', tenant: 1 } as Record<string, unknown>,
    })
    expect(result).toBe('About Us')
  })

  it('returns just the title when populated tenant has no name', () => {
    const result = generateSeoTitle({
      doc: { title: 'About Us', tenant: { id: 1 } } as Record<string, unknown>,
    })
    expect(result).toBe('About Us')
  })
})

describe('generateSeoDescription', () => {
  it('returns the post excerpt when present', () => {
    const result = generateSeoDescription({
      doc: { excerpt: 'A short summary.' } as Record<string, unknown>,
    })
    expect(result).toBe('A short summary.')
  })

  it('returns an empty string when there is no excerpt', () => {
    const result = generateSeoDescription({
      doc: { title: 'Page without excerpt' } as Record<string, unknown>,
    })
    expect(result).toBe('')
  })
})

describe('generateSeoImage', () => {
  it('returns heroImage when present', () => {
    const heroImage = { id: 1, url: 'https://example.com/img.jpg' }
    const result = generateSeoImage({
      doc: { heroImage } as Record<string, unknown>,
    })
    expect(result).toBe(heroImage)
  })

  it('returns null when there is no heroImage', () => {
    const result = generateSeoImage({
      doc: { title: 'No image' } as Record<string, unknown>,
    })
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd agencia-backend
pnpm exec vitest run tests/unit/seo-helpers.spec.ts
```

Expected: FAIL — module `@/plugins/seo-helpers` does not exist (import error). This is the desired red state.

- [ ] **Step 3: Implement the helpers**

Create `agencia-backend/src/plugins/seo-helpers.ts`:

```ts
/**
 * SEO auto-generation helpers used by @payloadcms/plugin-seo.
 *
 * Extracted into a separate module so the unit tests can import them
 * directly without booting the full Payload harness.
 */

export function generateSeoTitle({ doc }: { doc: Record<string, unknown> }): string {
  const title = (doc?.title as string) || ''
  const tenant =
    typeof doc?.tenant === 'object' && doc.tenant !== null
      ? (doc.tenant as { name?: string })
      : undefined
  const siteName = tenant?.name
  return siteName ? `${title} | ${siteName}` : title
}

export function generateSeoDescription({ doc }: { doc: Record<string, unknown> }): string {
  if (doc && 'excerpt' in doc && typeof doc.excerpt === 'string') {
    return doc.excerpt
  }
  return ''
}

export function generateSeoImage({ doc }: { doc: Record<string, unknown> }): unknown {
  if (doc && 'heroImage' in doc && doc.heroImage) {
    return doc.heroImage
  }
  return null
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd agencia-backend
pnpm exec vitest run tests/unit/seo-helpers.spec.ts
```

Expected: PASS — all 8 test cases green.

- [ ] **Step 5: Commit**

```bash
git add agencia-backend/src/plugins/seo-helpers.ts agencia-backend/tests/unit/seo-helpers.spec.ts
git commit -m "feat(seo): extract generateSeoTitle/Description/Image helpers with unit tests"
```

---

## Task 5: Write the failing integration test for the SEO plugin

**Files:**
- Create: `agencia-backend/tests/int/seo-plugin.int.spec.ts`

The test introspects resolved collection fields to confirm the plugin's `meta` group is injected into the right collections only. **Will fail until Task 6 registers the plugin.**

- [ ] **Step 1: Create the test file**

Create `agencia-backend/tests/int/seo-plugin.int.spec.ts`:

```ts
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, expect } from 'vitest'

/**
 * Verifies that @payloadcms/plugin-seo injects the `meta` group into
 * the SEO-enabled collections (pages, posts) and not into the others.
 */
describe('SEO plugin field injection', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  }, 60000)

  function findMetaGroup(fields: any[]): any | undefined {
    return fields.find((f) => f?.name === 'meta' && f?.type === 'group')
  }

  function namesOf(fields: any[]): string[] {
    return (fields ?? []).map((f) => f?.name).filter(Boolean)
  }

  it('adds a top-level `meta` group to `pages`', () => {
    const pages = payload.collections['pages']
    const meta = findMetaGroup(pages.config.fields)
    expect(meta).toBeDefined()
    expect(namesOf(meta.fields)).toEqual(
      expect.arrayContaining(['title', 'description', 'image']),
    )
  })

  it('adds a top-level `meta` group to `posts`', () => {
    const posts = payload.collections['posts']
    const meta = findMetaGroup(posts.config.fields)
    expect(meta).toBeDefined()
    expect(namesOf(meta.fields)).toEqual(
      expect.arrayContaining(['title', 'description', 'image']),
    )
  })

  it('does NOT add a `meta` group to header, footer, categories, tags, media, users, tenants', () => {
    const outOfScope = [
      'header',
      'footer',
      'categories',
      'tags',
      'media',
      'users',
      'tenants',
    ]
    for (const slug of outOfScope) {
      const collection = payload.collections[slug]
      expect(collection, `collection ${slug} should exist`).toBeDefined()
      const meta = findMetaGroup(collection.config.fields)
      expect(meta, `${slug} should not have a meta group`).toBeUndefined()
    }
  })

  it('preserves the root-level `title` field on `pages` (no shadowing)', () => {
    const pages = payload.collections['pages']
    const rootTitle = pages.config.fields.find((f: any) => f?.name === 'title')
    expect(rootTitle).toBeDefined()
    expect(rootTitle.type).toBe('text')
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails (red)**

```bash
cd agencia-backend
pnpm exec vitest run tests/int/seo-plugin.int.spec.ts
```

Expected: FAIL. The `pages` and `posts` collections will not have a top-level `meta` group yet because the plugin isn't registered. The "out of scope" cases may pass trivially (no meta group anywhere). The red state is on the `pages`/`posts` assertions.

- [ ] **Step 3: Do NOT commit yet**

Wait for Task 6 to make this test pass.

---

## Task 6: Register the SEO plugin in plugins/index.ts

**Files:**
- Modify: `agencia-backend/src/plugins/index.ts`

- [ ] **Step 1: Update plugins/index.ts**

Replace the current contents of `agencia-backend/src/plugins/index.ts` with:

```ts
import type { Config } from 'payload'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { seoPlugin } from '@payloadcms/plugin-seo'
import type { User } from '@/payload-types'

import {
  generateSeoTitle,
  generateSeoDescription,
  generateSeoImage,
} from './seo-helpers'

export const plugins: Config['plugins'] = [
  multiTenantPlugin<Config>({
    collections: {
      pages: {},
      media: {},
      header: {},
      footer: {},
      posts: {},
      categories: {},
      tags: {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    tenantsSlug: 'tenants',
    userHasAccessToAllTenants: (user: User) => {
      return user?.roles?.includes('super-admin') ?? false
    },
    // The cookie-based baseFilter on the admin users collection hides
    // users (including those we just created) whenever the payload-tenant
    // cookie is set, because it is checked BEFORE userHasAccessToAllTenants.
    // Access control wrapping (via addCollectionAccess) still correctly
    // restricts tenant-admins to their own tenants, so disabling this
    // filter is safe and matches the intended UX for super-admins.
    useUsersTenantFilter: false,
    tenantField: {
      admin: {
        disableListColumn: false,
        disableListFilter: false,
      },
    },
  }),
  seoPlugin({
    collections: ['pages', 'posts'],
    uploadsCollection: 'media',
    tabbedUI: true,
    interfaceName: 'SeoMeta',
    generateTitle: generateSeoTitle,
    generateDescription: generateSeoDescription,
    generateImage: generateSeoImage,
  }),
]
```

- [ ] **Step 2: Run the failing integration test from Task 5 — should now pass**

```bash
cd agencia-backend
pnpm exec vitest run tests/int/seo-plugin.int.spec.ts
```

Expected: PASS — all 4 test cases green. The plugin has injected `meta` into `pages` and `posts` and left the others alone.

- [ ] **Step 3: Run the unit tests from Task 4 — should still pass**

```bash
cd agencia-backend
pnpm exec vitest run tests/unit/seo-helpers.spec.ts
```

Expected: PASS — all 8 helper test cases still green.

- [ ] **Step 4: Regenerate Payload types**

```bash
cd agencia-backend
pnpm generate:types
```

Expected: regenerates `payload-types.ts` with the new `SeoMeta` interface and `meta` field on `Page` and `Post` types. Exit code 0.

- [ ] **Step 5: Commit**

```bash
git add agencia-backend/src/plugins/index.ts agencia-backend/src/payload-types.ts agencia-backend/tests/int/seo-plugin.int.spec.ts
git commit -m "feat(seo): register @payloadcms/plugin-seo on pages and posts"
```

---

## Task 7: Quality gates

**Files:** none modified — verification only.

- [ ] **Step 1: Typecheck**

```bash
cd agencia-backend
pnpm typecheck
```

Expected: exits 0. No type errors anywhere.

- [ ] **Step 2: Lint**

```bash
cd agencia-backend
pnpm lint
```

Expected: exits 0. No lint warnings or errors.

- [ ] **Step 3: Prettier check**

```bash
cd agencia-backend
pnpm prettier --check .
```

Expected: exits 0. All files formatted. If any file is unformatted, run `pnpm prettier --write .` and commit the formatting changes separately.

- [ ] **Step 4: Full test suite**

```bash
cd agencia-backend
pnpm test
```

Expected: all integration and unit tests pass. New tests from Tasks 4 and 6 are included.

---

## Task 8: Manual admin-panel verification

**Files:** none modified — manual smoke test only.

- [ ] **Step 1: Start the dev server**

```bash
cd agencia-backend
docker compose up -d postgres
pnpm dev
```

Expected: Next.js dev server boots without errors. Payload admin UI is reachable at `http://localhost:3000/admin`.

- [ ] **Step 2: Verify Pages admin UI**

Log in as a super-admin. Navigate to **Pages** → open any existing page (or create one).

Verify in the UI:
- The form shows two tabs: **General** and **SEO**.
- The "SEO" tab contains fields for Title, Description, and Image.
- A **SERP preview**, **Open Graph preview**, and **Twitter card preview** are visible inside the SEO tab.
- Leaving `meta.title` empty shows a SERP preview generated as `Page Title | <Tenant Name>`.

- [ ] **Step 3: Verify Posts admin UI**

Navigate to **Posts** → create a new post (no existing posts, per user confirmation).

Verify in the UI:
- Two tabs: **General** and **SEO**.
- Same SERP / OG / Twitter previews.
- The SEO fields default-populate from the post's title, excerpt, and heroImage.

- [ ] **Step 4: Verify scope (collections without SEO)**

Navigate to **Categories**, **Tags**, **Header**, **Footer**, **Media**, **Users**, **Tenants**.

Verify: none of these collections show an SEO tab or a `meta` field group.

- [ ] **Step 5: Commit the dev-only verification notes (optional)**

If any debug logs / comments were added during verification, remove them. Do NOT commit generated artefacts. Nothing new to commit in the happy path.

---

## Out-of-scope reminder

The Astro/Next.js client starters read SEO data from `post.metaTitle` (Posts) and `page.meta.title` (Pages). After this change, Posts must read from `post.meta.title` instead. That update is a **separate change** with its own spec and plan. Do not touch the starters in this PR.
