# Apply Progress — header-footer-to-collections

## Status: ✅ Complete

## Completed Tasks

### Phase 1-2: Backend Collections ✅
- [x] Created `collections/Header.ts` — CollectionConfig with navItems, logo, ctaText, ctaLink
- [x] Created `collections/Header/hooks/ensureUniqueTenant.ts` — beforeChange hook
- [x] Created `collections/Header/RowLabel.tsx` — RowLabel for navItems array
- [x] Created `collections/Footer.ts` — CollectionConfig with copyright, socialLinks, navColumns
- [x] Created `collections/Footer/hooks/ensureUniqueTenant.ts` — beforeChange hook
- [x] Created `collections/Footer/RowLabel.tsx` — RowLabel for navColumns array
- [x] Added `header: {}` and `footer: {}` to multi-tenant plugin collections
- [x] Updated `payload.config.ts` — imported Header/Footer from collections, removed globals
- [x] Deleted `globals/Header/` and `globals/Footer/` directories

### Phase 3: Starters ✅
- [x] Updated `astro-starter/src/lib/payload.ts` — changed API URLs from `/api/globals/header` to `/api/header?where[tenant.slug][equals]=...`
- [x] Updated `astro-starter/src/lib/types.ts` — widened Header/Footer types with id, tenant, timestamps
- [x] Updated `nextjs-starter/src/lib/payload.ts` — same API URL changes
- [x] Updated `nextjs-starter/src/lib/types.ts` — widened Header/Footer types

### Phase 4: Types ✅
- [x] Regenerated `payload-types.ts` via Payload CLI

### Phase 5: Tests ✅
- [x] Created `tests/int/header-footer.int.spec.ts` with 8 tests passing
  - Header: create, tenant uniqueness, public read, tenant isolation
  - Footer: create, tenant uniqueness, public read, tenant isolation

### Phase 6: Sync
- [ ] Client propagation via `pnpm sync:clients --apply` (manual step when ready)

## Files Changed
- **New**: `collections/Header.ts`, `collections/Header/hooks/ensureUniqueTenant.ts`, `collections/Header/RowLabel.tsx`
- **New**: `collections/Footer.ts`, `collections/Footer/hooks/ensureUniqueTenant.ts`, `collections/Footer/RowLabel.tsx`
- **New**: `tests/int/header-footer.int.spec.ts`
- **Modified**: `payload.config.ts`, `plugins/index.ts`, `payload-types.ts`
- **Deleted**: `globals/Header/`, `globals/Footer/`
- **Modified**: `astro-starter/src/lib/payload.ts`, `astro-starter/src/lib/types.ts`
- **Modified**: `nextjs-starter/src/lib/payload.ts`, `nextjs-starter/src/lib/types.ts`

## Test Results
- `pnpm typecheck` — ✅ passes with 0 errors
- `pnpm vitest run tests/int/header-footer.int.spec.ts` — ✅ 8/8 passed
- Pre-existing failures (unrelated): `api.int.spec.ts`, `validateLayoutStructure.int.spec.ts`

## Notes
- ctaLink uses manual field definition (not link() helper) to keep sub-fields optional
- Tenant uniqueness enforced via beforeChange hook (not DB index) per design
- No chained PRs needed (~280-350 lines, single PR within budget)
- Pre-existing test failures in `api.int.spec.ts` and `validateLayoutStructure.int.spec.ts` are unrelated to this change
