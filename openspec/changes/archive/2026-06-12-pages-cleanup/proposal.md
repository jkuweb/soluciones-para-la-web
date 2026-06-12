# Proposal: pages-cleanup

## Intent
Reorganize Pages collection structure by moving hook to collection directory and adding defaultPopulate for API optimization.

## Scope
- **2 deliverables**: Move validateLayoutStructure hook, add defaultPopulate config
- **0 deferred**: No items deferred

## Approach
Mechanical refactoring following Payload CMS conventions with minimal risk.

## Deliverables

### 1. Move validateLayoutStructure hook
- **From**: `src/hooks/validateLayoutStructure.ts`
- **To**: `src/collections/Pages/hooks/validateLayoutStructure.ts`
- **Update imports** in:
  - `src/collections/Pages.ts`
  - `tests/int/validateLayoutStructure.int.spec.ts`
- **Cleanup**: Delete old `src/hooks/` directory (only contained this file)

### 2. Add defaultPopulate to Pages
- Add `defaultPopulate: { title: true, slug: true }` to Pages collection config
- Matches Payload Website Template pattern
- Optimizes API responses by only returning title and slug by default

## Affected Areas
- `agencia-backend/src/collections/Pages/Pages.ts` (import path + config)
- `agencia-backend/tests/int/validateLayoutStructure.int.spec.ts` (import path)
- `agencia-backend/src/hooks/validateLayoutStructure.ts` (to be deleted)
- `agencia-backend/src/collections/Pages/hooks/validateLayoutStructure.ts` (new location)

## Capabilities

### New Capabilities
None

### Modified Capabilities
None

## Risk Level
**Low** — Mechanical file move + single config property. No logic changes.

## Rollback Plan
1. Restore `src/hooks/validateLayoutStructure.ts` from git
2. Revert import changes in Pages.ts and test file
3. Remove `defaultPopulate` from Pages config
4. Delete `src/collections/Pages/hooks/` directory

## Success Criteria
1. `validateLayoutStructure.ts` exists in new location
2. Old `src/hooks/` directory removed
3. All imports resolve correctly (TypeScript compilation passes)
4. Tests pass with `pnpm test`
5. Pages collection has `defaultPopulate: { title: true, slug: true }`

## Time Estimate
< 15 minutes (mechanical changes only)