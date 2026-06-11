# Tasks: Versions/Drafts for Pages

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~130-150 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Phase 1: Foundation — Config & Schema

- [x] 1.1 Add `versions` config to `agencia-backend/src/collections/Pages.ts`: `drafts: { autosave: { interval: 1000 }, schedulePublish: true }`, `maxPerDoc: 50`
- [x] 1.2 Remove `status` select field (lines 84-92) from `Pages.ts` fields array
- [x] 1.3 Update `admin.defaultColumns` in `Pages.ts`: replace `status` with `_status`
- [x] 1.4 Add `jobs` config to `agencia-backend/src/payload.config.ts`: `autoRun` with `shouldAutoRun` gated by `ENABLE_JOBS` env var

## Phase 2: Core — Access & Migration

- [x] 2.1 Update `access.read` in `Pages.ts`: public (no user) returns `{ _status: { equals: 'published' } }`; authenticated returns tenant-scoped filter
- [x] 2.2 Create `agencia-backend/src/migrations/001-status-to-versions.ts`: iterate pages, set `_status: 'published'` where old `status === 'published'` via `payload.update({ overrideAccess: true })`
- [x] 2.3 Run `pnpm typecheck` to verify Pages config compiles with Payload types

## Phase 3: Integration — Frontend & Tests

- [x] 3.1 In `astro-starter/src/lib/payload.ts`: replace `where[status][equals]=published` with `where[_status][equals]=published` in `getPages()` and `getPageBySlug()`
- [x] 3.2 In `nextjs-starter/src/lib/payload.ts`: same `status` → `_status` replacement in `getPages()` and `getPageBySlug()`
- [x] 3.3 In `astro-starter/src/lib/types.ts`: remove `status: 'draft' | 'published'` from `Page` interface
- [x] 3.4 In `nextjs-starter/src/lib/types.ts`: remove `status: 'draft' | 'published'` from `Page` interface
- [x] 3.5 In `tests/int/validateLayoutStructure.int.spec.ts`: replace `status: 'draft'` (line 74) and `status: 'published'` (line 218) with `_status` equivalents; update assertions (line 225)
- [x] 3.6 In `tests/int/api.int.spec.ts`: add test that public query returns only `_status: published` pages, drafts excluded

## Phase 4: Deployment — Railway Worker

- [ ] 4.1 Configure Railway project with two services: `backend` (ENABLE_JOBS=false) and `worker` (ENABLE_JOBS=true, no exposed port)
- [ ] 4.2 Verify scheduled publish: set `_publishOn` in past, confirm job executes via worker

## Verification Checklist

- [x] V.1 `pnpm typecheck` passes
- [x] V.2 `pnpm lint` passes
- [ ] V.3 `pnpm test` — all integration tests green
- [ ] V.4 Manual: tenant-admin can edit, autosave, publish a page
- [ ] V.5 Manual: public API returns only published pages
- [ ] V.6 Migration: existing published pages show `_status: published` after script
