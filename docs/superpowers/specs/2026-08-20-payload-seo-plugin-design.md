# Payload SEO Plugin — Design

**Date**: 2026-08-20
**Status**: Approved, awaiting implementation plan
**Scope**: Backend only (`agencia-backend`). No frontend starters.

## Context

The Payload CMS admin panel today uses two different hand-rolled SEO implementations:

- **`Pages`** — a tab "SEO" with `name: 'meta'` containing `title` + `description` (lines 283–298 of `Pages.ts`).
- **`Posts`** — a tab "SEO" with three flat fields `metaTitle`, `metaDescription`, `metaImage` (lines 207–230 of `Posts.ts`).

Both are minimal: no SERP preview, no Open Graph preview, no Twitter card preview, no auto-generation, no character counters, no canonical URL support.

Payload ships an official plugin — `@payloadcms/plugin-seo` — that replaces this hand-rolled work with a richer UI and a consistent data shape.

## Decision

Install `@payloadcms/plugin-seo` and:

1. Register it on `pages` and `posts` only.
2. Use `tabbedUI: true` so the plugin auto-organises each collection into a "General" tab (everything non-SEO) and an "SEO" tab (the `meta` group with title, description, image, plus SERP/OG/Twitter previews).
3. Auto-generate sensible defaults so editors don't have to fill in the obvious cases.
4. Delete the hand-rolled SEO fields from `Pages.ts` and `Posts.ts`. No migration script is needed because **all Posts have already been deleted** (user confirmed), and `Pages` already uses the same `meta.title` / `meta.description` naming that the plugin uses.

The plugin does not touch the multi-tenant isolation: `meta` lives inside the document, and `media` (the upload target for `meta.image`) is already tenant-isolated via `@payloadcms/plugin-multi-tenant`.

## What does NOT change in this spec

- **Astro/Next.js starters** consume `post.metaTitle` (Posts) and `page.meta.title` (Pages). After this change they need to read `post.meta.title`. **That is a separate change** — handled via `pnpm update:client` after the backend ships, per-client. Documented as a follow-up below.
- **Header, Footer, Categories, Tags** do not get SEO fields. Out of scope.
- **The `payload.config.ts` file is not modified** — only `src/plugins/index.ts`.

## Plugin configuration

Auto-generation helpers are extracted into `agencia-backend/src/plugins/seo-helpers.ts` so they can be unit-tested without booting Payload. Registered in `agencia-backend/src/plugins/index.ts` alongside the existing `multiTenantPlugin`:

```ts
// agencia-backend/src/plugins/seo-helpers.ts
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

```ts
// in agencia-backend/src/plugins/index.ts
import { seoPlugin } from '@payloadcms/plugin-seo'
import {
  generateSeoTitle,
  generateSeoDescription,
  generateSeoImage,
} from './seo-helpers'

// inside the plugins array:
seoPlugin({
  collections: ['pages', 'posts'],
  uploadsCollection: 'media',
  tabbedUI: true,
  interfaceName: 'SeoMeta',
  generateTitle: generateSeoTitle,
  generateDescription: generateSeoDescription,
  generateImage: generateSeoImage,
})
```

### Field naming

The plugin uses a group called `meta` with `title`, `description`, `image`. After this change:

- `page.meta.title` and `page.meta.description` continue to work — same names as before.
- `page.meta.image` is **new** (Pages never had a meta image field).
- `post.meta.title`, `post.meta.description`, `post.meta.image` replace the previous flat `post.metaTitle` / `post.metaDescription` / `post.metaImage`.

### Why `interfaceName: 'SeoMeta'`

Generates a reusable TypeScript interface in `payload-types.ts`. Useful for the frontend starter integration (follow-up work) so `meta` can be typed cleanly across Astro/Next.js.

### `defaultPopulate` change in Posts

`Posts.ts` currently declares `defaultPopulate: { title: true, slug: true, categories: true, metaImage: true }`.

After this change `metaImage` no longer exists. Replace it with `meta: true` so the populated shape still includes SEO data:

```ts
defaultPopulate: { title: true, slug: true, categories: true, meta: true }
```

## Files modified

| File | Change |
| --- | --- |
| `agencia-backend/package.json` | Add `@payloadcms/plugin-seo` at the same version line as other `@payloadcms/*` deps (`3.85.1`). |
| `agencia-backend/src/plugins/seo-helpers.ts` | New file — exports `generateSeoTitle`, `generateSeoDescription`, `generateSeoImage`. |
| `agencia-backend/src/plugins/index.ts` | Import `seoPlugin` + helpers, append to the `plugins` array. |
| `agencia-backend/src/collections/Pages.ts` | Delete the hand-rolled SEO tab with `name: 'meta'` (lines 283–298). |
| `agencia-backend/src/collections/Posts/Posts.ts` | Delete the hand-rolled SEO tab (lines 207–230). Update `defaultPopulate` to use `meta: true` instead of `metaImage: true`. |
| `agencia-backend/tests/int/seo-plugin.int.spec.ts` | New vitest integration test for collection field introspection. |
| `agencia-backend/tests/int/seo-helpers.int.spec.ts` | New vitest unit test for the three helper functions. |

## Testing

Two test files:

### `tests/int/seo-helpers.int.spec.ts` — pure unit tests

Imports the helper functions directly. No DB, no Payload boot.

1. `generateSeoTitle` returns `"Title | TenantName"` when tenant is populated with `{ name }`.
2. `generateSeoTitle` returns just `"Title"` when tenant is missing or an ID-only reference.
3. `generateSeoDescription` returns `excerpt` when the doc has one.
4. `generateSeoDescription` returns `""` when there is no excerpt.
5. `generateSeoImage` returns `heroImage` when present.
6. `generateSeoImage` returns `null` when there is no `heroImage`.

### `tests/int/seo-plugin.int.spec.ts` — integration tests

Uses the existing payload init harness to introspect resolved collection fields.

1. `payload.config.plugins` contains the SEO plugin instance.
2. `pages` collection has a top-level `meta` group with `title`, `description`, `image` fields.
3. `posts` collection has a top-level `meta` group with `title`, `description`, `image` fields.
4. `header`, `footer`, `categories`, `tags`, `media`, `users`, `tenants` do **not** have a top-level `meta` group (scope respected).
5. The existing Pages root-level `title` field is **not** shadowed by the meta `title` (i.e. no field name collision).

### Quality gates

- `pnpm typecheck`
- `pnpm lint`
- `pnpm prettier --check .`

## Verification checklist (manual)

After implementation:

- [ ] `pnpm dev` boots without errors in the admin panel.
- [ ] Open Pages → edit any page → confirm tabs are "General" + "SEO" with SERP preview visible.
- [ ] Open Posts → edit any post → confirm same UI; SEO fields populate defaults from title + excerpt + heroImage.
- [ ] Save a Page without filling meta → confirm generated title appears in the SERP preview as `Page Title | <Tenant Name>`.
- [ ] Save a Page, then a Post — confirm `meta.title` is populated and persisted to the DB.

## Out of scope (follow-up change)

Update the Astro/Next.js starters so client sites read SEO from the new group path:

- `astro-starter/src/lib/lexical.ts` — read `post.meta?.title` / `post.meta?.description` / `post.meta?.image`.
- `astro-starter/src/pages/blog/post/[slug].astro` — render `<title>` and `<meta>` tags from `post.meta.*`.
- `nextjs-starter/src/lib/lexical.ts` — same.
- `nextjs-starter/src/app/blog/post/[slug]/page.tsx` — same.

Propagation: use `pnpm update:client --slug=<client> --apply` per client to bump package.json, then manually update the affected starter files in each client repo (or extend `sync:client`'s allowlist to include the SEO-consuming components).

This follow-up is **not** part of this spec. The backend plugin ships first; the starter change is a separate change with its own spec.

## Risks

- **Risk**: The plugin's `generateTitle` runs at form render time. If the form is loaded shallow (`depth: 0`) the tenant is just an ID and the title falls back to plain `${doc.title}`. **Mitigation**: the admin panel default loads `depth: 1` for relation fields, so this should be a non-issue in practice. If a user reports the site name missing in the SERP preview, switch the admin's `defaultDepth` to 1 (Payload's default behaviour).
- **Risk**: The plugin **adds** a top-level `meta` group to every collection listed in `collections`. If a collection already has a `meta` field, Payload throws a duplicate-name error at boot. **Mitigation**: this spec deletes the existing `meta` group on `pages` (via the SEO tab's `name: 'meta'`) before the plugin runs. `posts` does not have a top-level `meta` field (its SEO tab fields were `metaTitle/metaDescription/metaImage`, flat). Verified.
- **Risk**: Frontend clients reading `post.metaTitle` will break after this ships. **Mitigation**: the follow-up spec must be picked up before any new client ships, or existing clients must keep a compatibility shim in their frontend code.
