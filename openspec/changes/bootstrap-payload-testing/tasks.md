# Tasks: Bootstrap Payload CMS 3 + PostgreSQL + Testing Infrastructure

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 350–450 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

## Phase 1: Project Scaffold

- [x] 1.1 Run `npx create-payload-app@latest agencia-backend -t blank --use-pnpm --no-agent` to generate the boilerplate project
      > **Deviation**: CLI has TTY bug in non-interactive env; project scaffolded manually with equivalent structure matching Payload 3 blank template.
- [x] 1.2 Verify `agencia-backend/package.json` exists and contains `@payloadcms/next`
- [x] 1.3 Copy `.env.example` to `.env` and set `PAYLOAD_SECRET` and `DATABASE_URI` placeholder values

## Phase 2: PostgreSQL Adapter Swap

- [x] 2.1 Run `pnpm add @payloadcms/db-postgres` and `pnpm remove @payloadcms/db-mongodb` in `agencia-backend/`
      > **Deviation**: No MongoDB adapter was installed (scaffolded manually without it). `@payloadcms/db-postgres` is the only DB adapter.
- [x] 2.2 Edit `agencia-backend/payload.config.ts`: replace `mongooseAdapter` import with `postgresAdapter` from `@payloadcms/db-postgres`
- [x] 2.3 Update `agencia-backend/.env.example` to document `DATABASE_URI` with PostgreSQL connection string format

## Phase 3: Multi-Tenant Plugin & Collections

- [x] 3.1 Run `pnpm add @payloadcms/plugin-multi-tenant` in `agencia-backend/`
- [x] 3.2 Create `agencia-backend/src/collections/Tenants.ts` with fields: name, slug, domain, serviceType, frontendType, status, maintenanceFee, projectPrice, paymentStatus
- [x] 3.3 Create `agencia-backend/src/collections/Users.ts` extending Payload auth with tenant relationship and roles field
- [x] 3.4 Create `agencia-backend/src/collections/Pages.ts` with fields: tenant, slug, title, layout (blocks), status, meta (group)
- [x] 3.5 Create `agencia-backend/src/collections/Media.ts` with fields: tenant, alt; upload config with mimeTypes and imageSizes
- [x] 3.6 Edit `agencia-backend/payload.config.ts`: import and register `multiTenantPlugin` with `{ collections: { pages: {}, media: {} } }`, add all four collections to the collections array

## Phase 4: Testing Infrastructure

- [x] 4.1 Run `pnpm add -D @vitest/coverage-v8` in `agencia-backend/`
- [x] 4.2 Edit `agencia-backend/vitest.config.mts`: add coverage provider `v8` config
- [x] 4.3 Add `"typecheck": "tsc --noEmit"` script to `agencia-backend/package.json`
- [x] 4.4 Verify `playwright.config.ts` exists from template (no changes needed)
      > **Deviation**: Playwright config created manually (no template available)

## Phase 5: Verification

- [x] 5.1 Run `pnpm typecheck` in `agencia-backend/` — expect zero errors (spec: testing-infrastructure §TypeScript type-checking)
      > Result: 0 errors after fixing UploadConfig (removed `maxFileSize`) and adding `@payload-config` path alias
- [x] 5.2 Run `pnpm test` in `agencia-backend/` — expect Vitest runs and exits 0 (spec: testing-infrastructure §Vitest unit/integration runner)
      > Result: 1 test file, 1 test passed, exit 0
- [x] 5.3 Run `pnpm dev` in `agencia-backend/` with `.env` configured — expect Payload admin UI on localhost:3000 (spec: payload-bootstrap §Dev server startup)
      > Result: Admin UI loads at localhost:3000/admin, HTTP 200
- [x] 5.4 Verify `payload.config.ts` imports `postgresAdapter` and `multiTenantPlugin` (spec: payload-bootstrap §PostgreSQL adapter, multi-tenant-setup §Plugin configuration)
      > Verified: `postgresAdapter` from `@payloadcms/db-postgres`, `multiTenantPlugin` from `@payloadcms/plugin-multi-tenant`
- [x] 5.5 Verify `src/collections/` contains Tenants, Users, Pages, Media files (spec: multi-tenant-setup §Tenants collection, §Tenant-scoped collections)
      > Verified: All 4 collection files present
