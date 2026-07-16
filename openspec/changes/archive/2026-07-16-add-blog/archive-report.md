# Archive Report: add-blog

## Status

**Archived** on 2026-07-16.

## Change

**Name**: add-blog
**Summary**: Added multi-tenant blog functionality to Agencia — three new Payload collections (Posts, Categories, Tags) registered with the multi-tenant plugin, a shared `validateUniqueSlug` factory, a preview endpoint, and full blog rendering in both Astro and Next.js starters (PostCard/Post components, 4 blog routes each, tenant-filtered queries, CSS Modules). Sync:client allowlist extended to propagate blog files to existing client repos.

## Specs Archived

| # | Spec | Action | Details |
|---|------|--------|---------|
| 1 | `blog-posts` | Created | Posts collection schema, draft workflow, access control, per-tenant slug uniqueness, preview endpoint, default populate (5 requirements) |
| 2 | `blog-taxonomy` | Created | Categories and Tags collections, access control, delete behavior, per-tenant slug uniqueness (5 requirements) |
| 3 | `blog-frontend-rendering` | Created | URL routes, tenant filtering, pagination, SEO rendering, Lexical→HTML, revalidation, PostCard/Post components, high-volume cap (9 requirements) |
| 4 | `multi-tenant-setup` | Updated | Appended 2 requirements: Blog Collections in Plugin Map, Per-Tenant Slug Uniqueness Convention. 4 existing requirements preserved. |

**Total**: 3 new canonical specs, 1 modified. All 21 requirements across 4 specs verified.

## PRs

5 stacked PRs, all merged-ready:

| PR | Branch | Commits | Lines | Status |
|----|--------|---------|-------|--------|
| PR 1 | `feat/blog-pr1-backend` | 18 commits | ~390 | Complete |
| PR 2 | `feat/blog-pr2-astro-lib-pages` | — | ~570 | Complete |
| PR 3 | `feat/blog-pr3-astro-components` | — | ~240 | Complete |
| PR 4 | `feat/blog-pr4-nextjs-lib-pages` | — | ~570 | Complete |
| PR 5 | `feat/blog-pr5-nextjs-components-sync` | 4 commits (cc6a743, ca04c04, 5885bd9, 1e297ae) | ~592 | Complete |

**Tasks completed**: T-1 through T-12 (all 12).
**Reconciliation note**: T-11 and T-12 headings in `tasks.md` lacked explicit `[x]` checkboxes (they were bare headings without any checkbox marker). The checkboxes were added during archive as mechanical reconciliation, backed by apply-progress (Engram #374) confirming all tasks complete and verify-report confirming all 21 requirements pass.

## Verification Result

**PASS** — 0 critical, 3 warnings, 3 suggestions. All 21 requirements covered. Quality gates pass (backend typecheck/lint/prettier, starters tsc/prettier on changed files). Cross-cutting checks pass (no Tailwind, tenant filtering on every query, `revalidate: 60` on Next.js, `horizontalrule` in both lexical.ts).

### Outstanding Warnings

1. **W-1: Astro prettier gap (pre-existing)** — `astro-starter` has no `prettier-plugin-astro` installed. `.astro` files cannot be checked by prettier. Pre-existing; not introduced by this change.
2. **W-2: `as any` casts on collection slugs** — 4 casts in `Posts.ts` and `validateUniqueSlug.ts` because Payload types haven't been regenerated. Run `pnpm payload generate:types` after merge.
3. **W-3: Categories/Tags `slugify` duplication** — Three copies of the same `slugify()` function (`Categories.ts`, `Tags.ts`, `Posts/hooks/generateSlug.ts`). Extract to shared utility.

### Outstanding Suggestions

1. **S-1: Astro blog index has no pagination** — Blog index shows 10 posts with no pager. Category/tag pages have pagination. Consider adding pagination or a "View all posts" link in v2.
2. **S-2: PostCard/Post CSS Modules are nearly identical across starters** — Same 113-line and 154-line CSS files in both Astro and Next.js. A shared CSS file could be considered for v2.
3. **S-3: `getMediaUrl` helper duplicated** — Both starters define identical `getMediaUrl()` in `payload.ts`. Could be extracted to a shared utility.

## Known Follow-ups

- Run `pnpm payload generate:types` in `agencia-backend/` once the backend is running to eliminate `as any` casts (W-2)
- Refactor `slugify()` into a shared utility (W-3)
- Refactor `Pages/hooks/validateUniqueSlug.ts` to use the new shared factory
- Add `prettier-plugin-astro` to the workspace to close the prettier gap (W-1)
- Add automated tests when a test runner is added to the project
- Consider blog index pagination (S-1)
- Consider shared CSS for PostCard/Post (S-2)
- Consider extracting `getMediaUrl` to shared utility (S-3)

## Sign-off

Ready for merge by the team. The change is fully planned, implemented, verified, and archived. Recommend creating a PR that merges the 5 stacked branches to main in order, or letting the team review and merge each PR individually.
