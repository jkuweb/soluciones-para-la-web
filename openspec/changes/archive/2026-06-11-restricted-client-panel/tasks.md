# Tasks: Restricted Client Panel

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 350-450 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

## Phase 1: Backend Hook

- [x] 1.1 Create `agencia-backend/src/hooks/validateLayoutStructure.ts` — `beforeChange` hook comparing `data.layout` vs `originalDoc.layout` (IDs, types, order) for non-super-admins. Reject with 400 + error message on mismatch.
- [x] 1.2 Write integration test `agencia-backend/tests/int/validateLayoutStructure.int.spec.ts` — RED: tenant-admin structural change rejected (add, remove, reorder scenarios from spec 3-5). GREEN: content-only edit passes (scenario 2), super-admin bypass passes (scenario 1), metadata-only change passes (scenario 8).

## Phase 2: Frontend Component

- [x] 2.1 Create `agencia-backend/src/components/RestrictedBlocksField.tsx` — wrap `BlocksField` from `@payloadcms/ui`, use `useAuth()` to detect role, apply `.restricted-blocks-field--tenant-admin` class to wrapper div, show info banner for tenant-admin.
- [x] 2.2 Create `agencia-backend/src/components/RestrictedBlocksField.css` — hide `.blocks-field__drawer-toggler`, per-block `.collapsible__drag` (drag handles), and `.array-actions` (remove/duplicate/move buttons) when `.restricted-blocks-field--tenant-admin` is present. Style info banner.

## Phase 3: Integration Wiring

- [x] 3.1 Modify `agencia-backend/src/collections/Pages.ts` — add `hooks: { beforeChange: [validateLayoutStructure] }` to collection config. Set `admin.components.Field` on `layout` field to `RestrictedBlocksField`.
- [x] 3.2 Modify `agencia-backend/src/collections/Users.ts` — add role description comments: super-admin (full CRUD), tenant-admin (content-only), tenant-editor (future).

## Phase 4: Verification

- [x] 4.1 Run `pnpm test` — all 5 integration tests pass (1 API + 4 validateLayoutStructure).
- [x] 4.2 Run `pnpm lint` — 0 errors (1 pre-existing warning in `my-route/route.ts`).
- [~] 4.3 `pnpm typecheck` — 0 errors from PR #2 changes; pre-existing type errors in test file (Blockish type compatibility) from PR #1 are not related to this change.
