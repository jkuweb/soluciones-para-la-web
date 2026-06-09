# Proposal: Bootstrap Payload CMS 3 + PostgreSQL + Testing Infrastructure

## Intent

Scaffold the `agencia-backend` project from zero using the official Payload CMS 3 blank template, switch to PostgreSQL, add multi-tenancy, and establish a test-ready toolchain (Vitest, Playwright, tsc). This resolves the two critical risks in the design doc: no test infrastructure and no project scaffold.

## Scope

### In Scope
- Generate `agencia-backend` via `create-payload-app@latest` blank template
- Swap database adapter to `@payloadcms/db-postgres`
- Install and configure `@payloadcms/plugin-multi-tenant`
- Scaffold collections: Tenants, Users, Pages, Media
- Add `@vitest/coverage-v8` and `typecheck` script
- Provide `.env.example` with required variables
- Document PostgreSQL prerequisites and secret generation

### Out of Scope
- Front-end projects (Astro / Next.js) — separate changes
- Stripe, Cloudinary, Notion/Airtable integrations — future changes
- Production deployment or CI/CD pipelines
- Custom business logic beyond collection boilerplate

## Capabilities

### New Capabilities
- `payload-bootstrap`: Scaffold backend using `create-payload-app` blank template
- `testing-infrastructure`: Configure Vitest, Playwright, tsc `--noEmit`, and coverage
- `multi-tenant-setup`: Install and configure `@payloadcms/plugin-multi-tenant` with tenant-scoped collections

### Modified Capabilities
None (greenfield project — no existing specs to modify).

## Approach

1. **Run CLI** (`npx create-payload-app@latest agencia-backend -t blank --use-pnpm --no-agent`) with PostgreSQL selected.
2. **Post-generation modifications**:
   - Replace `@payloadcms/db-mongodb` with `@payloadcms/db-postgres` in `package.json`.
   - Update `payload.config.ts` to use `postgresAdapter`.
   - Add `@payloadcms/plugin-multi-tenant` and wire it in config.
   - Add `@vitest/coverage-v8` and a `typecheck` script.
3. **Scaffold collections** in `src/collections/` per the design doc §3.
4. **Environment**: Provide `.env.example` with `PAYLOAD_SECRET` and `POSTGRES_URL` placeholders.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `agencia-backend/package.json` | Modified | Swap DB adapter, add plugin, add coverage dependency |
| `agencia-backend/payload.config.ts` | Modified | PostgreSQL adapter + multi-tenant plugin |
| `agencia-backend/vitest.config.mts` | Modified | Ensure coverage provider is v8 |
| `agencia-backend/playwright.config.ts` | New | E2E baseline config (already in template) |
| `agencia-backend/src/collections/` | New | Tenants, Users, Pages, Media |
| `agencia-backend/.env.example` | New | Document required env vars |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Node 24 build issues (native deps) | Low | pnpm `onlyBuiltDependencies` already covers `sharp`; monitor logs |
| Interactive CLI blocks automation | Low | Pipe `printf "PostgreSQL\n"` into the command |
| PostgreSQL DB not created | Med | Document `createdb` step in setup instructions |
| Multi-tenant plugin API changes | Med | Pin to tested Payload 3 minor version |

## Rollback Plan

- Delete the `agencia-backend/` directory entirely.
- Remove any PostgreSQL database/user created for this project.
- Re-run the CLI from scratch if needed.

## Dependencies

- Node.js `>=24.15.0` (already present)
- PostgreSQL running locally with a database and user created
- pnpm installed

## Success Criteria

- [ ] `pnpm dev` starts the Payload admin UI without errors
- [ ] `pnpm test` runs the Vitest suite provided by the template
- [ ] `pnpm test:e2e` runs Playwright tests provided by the template
- [ ] `pnpm typecheck` runs `tsc --noEmit` with zero errors
- [ ] `payload.config.ts` imports `postgresAdapter` and `@payloadcms/plugin-multi-tenant`
- [ ] `src/collections/` contains `Tenants`, `Users`, `Pages`, `Media` files
