# Proposal: Template Improvements

## Intent

Reduce duplication in access-control logic across collections and globals by extracting reusable factories, matching the Payload Website Template structure. Add a URL helper for CORS, live preview, and server-side configuration. Prepare the ground for future collection refactoring.

## Scope

### In Scope
- `src/access/anyone.ts` — public read access
- `src/access/authenticated.ts` — any logged-in user
- `src/access/authenticatedOrPublished.ts` — authenticated users see all; public sees only `_status: published`
- `src/access/tenantAccess.ts` — reusable tenant-constraint factory (extracts `user.tenants[].tenant.id` with type-safe string/number/object handling)
- `src/utilities/deepMerge.ts` — improve array handling (merge by index instead of overwrite)
- `src/utilities/getURL.ts` — URL helper for `NEXT_PUBLIC_SERVER_URL` / `VERCEL_URL` fallback

### Out of Scope
- Refactoring existing collections to use the new factories (future change)
- Header/Footer global access migration
- Any behavior changes to existing API responses

## Capabilities

### New Capabilities
- `access-factories`: Reusable Payload access control functions (`anyone`, `authenticated`, `authenticatedOrPublished`, `tenantAccess`)
- `url-utilities`: Environment-aware URL helpers (`getURL`, `getServerSideURL`)

### Modified Capabilities
- None (this is pure infrastructure; no spec-level behavior changes)

## Approach

Create thin, typed, pure functions in `src/access/` following the Payload Website Template pattern. `tenantAccess` accepts a `fieldName` parameter (default `'tenant'`) so it can be reused for `Pages`, `Media`, and even `Tenants` (using `id` field). Update `deepMerge` to concatenate arrays by index rather than replace. Add `getURL` reading `NEXT_PUBLIC_SERVER_URL` first, then `VERCEL_URL`, with localhost fallback.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/access/` | New | Four reusable access factories |
| `src/utilities/deepMerge.ts` | Modified | Array handling added |
| `src/utilities/getURL.ts` | New | Environment-aware URL helper |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `tenantAccess` factory breaks existing tenant filtering | Low | Keep exact same logic; only extract to function. Add unit tests for extraction. |
| `deepMerge` behavior change breaks config merge | Low | Add explicit array test; keep object merge identical. |

## Rollback Plan

Delete the new `src/access/` directory and `src/utilities/getURL.ts`. Revert `src/utilities/deepMerge.ts` via git. No database or API changes required.

## Dependencies

- None

## Success Criteria

- [ ] `pnpm typecheck` passes with new files
- [ ] `pnpm lint` passes
- [ ] Unit tests exist for `tenantAccess` extraction logic (string/number/object id)
- [ ] Unit tests exist for `deepMerge` array concatenation
- [ ] `getURL` returns correct URL in dev, preview, and production environments
- [ ] Existing collections compile unchanged (no refactoring yet)
