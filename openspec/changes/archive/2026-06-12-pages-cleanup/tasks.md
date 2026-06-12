# Tasks: pages-cleanup

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~25 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | not-needed |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: not-needed
400-line budget risk: Low

## Phase 1: Move validateLayoutStructure hook

- [x] 1.1 Copy `agencia-backend/src/hooks/validateLayoutStructure.ts` → `agencia-backend/src/collections/Pages/hooks/validateLayoutStructure.ts` (identical content)
- [x] 1.2 Update import in `agencia-backend/src/collections/Pages.ts` from `@/hooks/validateLayoutStructure` to `@/collections/Pages/hooks/validateLayoutStructure`
- [x] 1.3 Update import in `agencia-backend/tests/int/validateLayoutStructure.int.spec.ts` from `@/hooks/validateLayoutStructure` to `@/collections/Pages/hooks/validateLayoutStructure`
- [x] 1.4 Delete `agencia-backend/src/hooks/validateLayoutStructure.ts`
- [x] 1.5 Delete `agencia-backend/src/hooks/` directory (now empty)

## Phase 2: Add defaultPopulate

- [x] 2.1 Add `defaultPopulate: { title: true, slug: true }` to the Pages collection config in `agencia-backend/src/collections/Pages.ts` (after the `admin` block)

## Phase 3: Verify

- [x] 3.1 Run `pnpm typecheck` — must pass with zero errors
- [x] 3.2 Run `pnpm test` — existing `validateLayoutStructure.int.spec.ts` must pass
