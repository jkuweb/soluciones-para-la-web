# Tasks: Template Improvements — Reusable Access & Utilities

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 150–200 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Phase 1: Foundation Utilities

- [ ] 1.1 Create `src/utilities/resolveTenantIds.ts` — export `resolveTenantIds(tenants)` handling string/number/object shapes per design contract. Include `isPopulatedTenant` type guard.
- [ ] 1.2 Create `src/utilities/getURL.ts` — export `getURL()` reading `NEXT_PUBLIC_SERVER_URL`, stripping trailing slash, falling back to `http://localhost:3000` with `console.warn`.
- [ ] 1.3 Modify `src/utilities/deepMerge.ts` — add array-of-objects merge logic: detect via `sourceArr[0]` being non-null object → merge by index; else replace target with source.

## Phase 2: Access Factories

- [ ] 2.1 Create `src/access/anyone.ts` — export `anyone` as `() => true`.
- [ ] 2.2 Create `src/access/authenticated.ts` — export `authenticated` returning `Boolean(req?.user)`.
- [ ] 2.3 Create `src/access/authenticatedOrPublished.ts` — export `authenticatedOrPublished`: authenticated → `true`; else `{ _status: { equals: 'published' } }`.
- [ ] 2.4 Create `src/access/tenantAccess.ts` — export `tenantAccess(fieldName = 'tenant')` factory. Super-admin → `true`. No user → `false`. Otherwise → `{ [fieldName]: { in: resolveTenantIds(user.tenants) } }`.

## Phase 3: Testing

- [ ] 3.1 Write unit tests for `resolveTenantIds` — string ID, number ID, object ID, empty array, mixed types. File: `tests/int/utilities/resolveTenantIds.spec.ts`.
- [ ] 3.2 Write unit tests for `deepMerge` — recursive objects, array-of-objects merge by index, non-object array replacement, null/undefined handling. File: `tests/int/utilities/deepMerge.spec.ts`.
- [ ] 3.3 Write unit tests for `getURL` — env set, env with trailing slash, env missing. File: `tests/int/utilities/getURL.spec.ts`.
- [ ] 3.4 Write integration tests for `tenantAccess` — super-admin bypass, tenant-user constrained, unauthenticated denied, custom field name. File: `tests/int/access/tenantAccess.spec.ts`.
- [ ] 3.5 Write integration tests for `authenticatedOrPublished` — authenticated sees all, public sees published only. File: `tests/int/access/authenticatedOrPublished.spec.ts`.

## Phase 4: Verification

- [ ] 4.1 Run `pnpm typecheck` — confirm zero errors across all new files.
- [ ] 4.2 Run `pnpm test` — confirm all new and existing tests pass.
- [ ] 4.3 Run `pnpm lint` — confirm no lint violations in new files.
