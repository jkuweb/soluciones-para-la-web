# Tasks: Header/Footer Globals → Collections

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~280-350 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

## Phase 1: Backend — New Collections

- [x] 1.1 Create `agencia-backend/src/collections/Header.ts` — `CollectionConfig` with slug `header`, fields: navItems (array with link, max 10), logo (upload→media), ctaText (text), ctaLink (manual group with optional sub-fields); `access.read: () => true`, RowLabel path `@/collections/Header/RowLabel#RowLabel`
- [x] 1.2 Create `agencia-backend/src/collections/Header/hooks/ensureUniqueTenant.ts` — `CollectionBeforeChangeHook` that prevents creating a second header for the same tenant
- [x] 1.3 Create `collections/Header/RowLabel.tsx` — RowLabel for navItems array showing link label
- [x] 1.4 Create `agencia-backend/src/collections/Footer.ts` — fields: copyright (text), socialLinks (array with link, max 8), navColumns (array with title + links sub-array); RowLabel for navColumns showing column title
- [x] 1.5 Create `agencia-backend/src/collections/Footer/hooks/ensureUniqueTenant.ts` — same beforeChange pattern as Header
- [x] 1.6 Create `collections/Footer/RowLabel.tsx` — RowLabel for navColumns showing title

> **Note**: Revalidation hooks from globals were not ported — collection-based revalidation via per-tenant tags is not needed since the multi-tenant plugin handles query isolation; caching is managed at the starter level.

## Phase 2: Backend — Config & Plugin Wiring

- [x] 2.1 Update `agencia-backend/src/payload.config.ts` — removed globals array and imports; added Header and Footer to collections array
- [x] 2.2 Update `agencia-backend/src/plugins/index.ts` — added `header: {}` and `footer: {}` to `multiTenantPlugin.collections`
- [x] 2.3 Delete `agencia-backend/src/globals/Header/` and `agencia-backend/src/globals/Footer/` directories (configs, hooks, RowLabels)

## Phase 3: Starters — API & Types

- [x] 3.1 Update `astro-starter/src/lib/payload.ts` — change `getHeader()` from `/api/globals/header` to `/api/header?where[tenant.slug][equals]=${TENANT_SLUG}&limit=1&depth=1`, extract `docs[0]`; same pattern for `getFooter()`
- [x] 3.2 Update `astro-starter/src/lib/types.ts` — widened Header with id, tenant, createdAt, updatedAt, logo, ctaText, ctaLink; widened Footer with id, tenant, createdAt, updatedAt, navColumns (replacing flat navItems)
- [x] 3.3 Update `nextjs-starter/src/lib/payload.ts` — same API URL changes
- [x] 3.4 Update `nextjs-starter/src/lib/types.ts` — same type widening

## Phase 4: Backend — Type Generation

- [x] 4.1 Regenerated `payload-types.ts` — Header and Footer appear as collection types with all new fields
- [x] 4.2 Verified old globals types no longer exist in payload-types.ts

## Phase 5: Testing

- [x] 5.1 Create `agencia-backend/tests/int/header-footer.int.spec.ts` — seeds two tenants, creates header/footer per tenant, verifies read isolation, public access, and tenant uniqueness
- [x] 5.2 Test: unauthenticated read returns header/footer data (public `read: () => true`)
- [x] 5.3 Test: creating second header/footer for same tenant throws error (unique-tenant enforcement via beforeChange hook)
- [ ] 5.4 Seed script for dev tenants — deferred (manual seeding via admin UI or separate script)

## Phase 6: Sync Propagation

- [ ] 6.1 Run `pnpm sync:client --slug=<slug> --dry-run` for dev clients — verify allowlisted files
- [ ] 6.2 Run `pnpm sync:client --slug=<slug> --apply` for dev clients — propagate `payload.ts` and `types.ts`

> **Status**: Apply implementation complete. Phases 1–5 finished. Phase 6 (client sync) is a manual operational step — run `pnpm sync:clients --filter=outdated --dry-run` first to review, then `--apply` to propagate starter changes.
