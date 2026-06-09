# Exploration: Bootstrap Payload CMS 3 + PostgreSQL + Testing Infrastructure

## Current State

The project is greenfield. There is no `package.json`, no TypeScript config, no code, and no tests. The only existing artifact is the approved architecture design document at `docs/superpowers/specs/2026-06-08-agencia-saas-design.md`, which specifies:

- **Backend**: Payload CMS 3 with PostgreSQL
- **Multi-tenancy**: `@payloadcms/plugin-multi-tenant`
- **Testing**: Must be introduced (Vitest, Playwright, tsc)
- **Frontends**: Astro and Next.js are separate future work; this change focuses on the Payload backend scaffold

The environment already provides:
- **Node.js v24.15.0** (Payload 3 blank template explicitly requires `>=24.15.0`)
- **pnpm, npm, yarn** all installed
- **PostgreSQL** running locally (`/var/run/postgresql:5432` accepting connections)

## Affected Areas

- `/home/joseba/Clientes/agencia/agencia-backend/` — new Payload CMS backend root (per design doc §7.1)
- `openspec/changes/bootstrap-payload-testing/` — this SDD change folder
- `.env` / `.env.example` — database credentials and `PAYLOAD_SECRET`
- `package.json` — dependencies and test scripts
- `vitest.config.mts` — unit/integration test config
- `playwright.config.ts` — E2E test config
- `src/payload.config.ts` — Payload config with postgres adapter + multi-tenant plugin
- `src/collections/` — Tenants, Users, Pages, Media (per design doc §3)

## Approaches

### 1. **Use `create-payload-app` blank template + adapt**

Run `npx create-payload-app@latest agencia-backend -t blank --use-pnpm --no-agent`, select PostgreSQL in the interactive prompt, then customize.

- **Pros**:
  - Blank template already ships with **Vitest**, **Playwright**, **tsx**, **@vitejs/plugin-react**, **jsdom**, **@testing-library/react**, and **vite-tsconfig-paths**.
  - Uses **Next.js 16.2.7** and **React 19.2.6**, matching Payload 3's latest expectations.
  - `tsconfig.json` and `next.config.ts` are pre-configured with Payload-specific aliases (`@payload-config`).
  - Fastest path to a running, testable scaffold.

- **Cons**:
  - The CLI still requires an **interactive database selection** (cannot be fully non-interactive via flags as of v3.85.1), so we must pipe input or run interactively.
  - Default DB adapter in the template is MongoDB; we must swap to `@payloadcms/db-postgres` after generation.
  - We still need to add `@payloadcms/plugin-multi-tenant` and wire collections.

- **Effort**: Low

### 2. **Manual scaffold from multi-tenant example**

Clone the official `examples/multi-tenant` directory from the Payload monorepo, add Vitest/Playwright manually, and upgrade dependencies.

- **Pros**:
  - Example already demonstrates multi-tenant collections (Tenants, Users, Pages) and access control patterns (`isSuperAdmin`, `getUserTenantIDs`).
  - Already uses `postgresAdapter`.

- **Cons**:
  - The example **lacks testing infrastructure entirely** (no Vitest, no Playwright).
  - Uses older Next.js/React versions and `workspace:*` / `latest` tags that would need pinning.
  - More manual work to add tsconfig paths, test configs, and modern tooling.
  - Higher risk of misconfiguration because we're piecing things together rather than starting from a tested template.

- **Effort**: Medium

### 3. **Use multi-tenant example directly as base**

Copy the multi-tenant example verbatim and only add missing pieces.

- **Pros**:
  - Proven working multi-tenant setup.

- **Cons**:
  - Same as Option 2: no tests, outdated versions, more manual patching.
  - The example's goal is demonstration, not production scaffolding.

- **Effort**: Medium

## Recommendation

**Option 1: `create-payload-app` blank template + adapt.**

The blank template is the **official, maintained, and tested scaffold** for Payload 3. It already solves the "no test infrastructure" risk by including Vitest and Playwright. The only adaptations needed are:

1. Swap `@payloadcms/db-mongodb` for `@payloadcms/db-postgres` in `package.json`.
2. Update `payload.config.ts` to use `postgresAdapter`.
3. Add `@payloadcms/plugin-multi-tenant` and configure it.
4. Add coverage provider (`@vitest/coverage-v8`) and a `typecheck` script (`tsc --noEmit`).
5. Replace default collections with Tenants, Users, Pages, Media per the design doc.

This gives us a **modern, test-ready, type-safe scaffold** in the least time with the lowest risk.

## Risks

1. **Node.js 24 bleeding edge**: Node v24.15.0 is very new. While the blank template explicitly targets it, some transitive dependencies (especially native modules like `sharp`) may have build issues. Mitigation: pnpm `onlyBuiltDependencies` already handles `sharp`; monitor CI.
2. **Interactive CLI**: `create-payload-app` does not expose a `--database` flag; we must pipe `PostgreSQL\n` or run interactively. Mitigation: use `printf "PostgreSQL\n" | npx create-payload-app ...` in automation.
3. **PostgreSQL local database**: We need a database created (e.g., `agencia_payload_dev`) and a user with permissions. Mitigation: document setup steps in `README.md`.
4. **Multi-tenant plugin evolution**: The plugin API is actively developed (recent `useBaseFilter` deprecation). Mitigation: pin to a specific Payload 3 minor version and read release notes before upgrades.
5. **No `.env` committed**: `PAYLOAD_SECRET` and `POSTGRES_URL` will be required but must not be committed. Mitigation: provide `.env.example` and document secret generation (`openssl rand -hex 32`).

## Ready for Proposal

**Yes.**

The orchestrator should tell the user that the exploration is complete and recommend proceeding to `sdd-propose` for the change `bootstrap-payload-testing`. The proposal should cover:

- Exact CLI command to run `create-payload-app`
- Post-generation modifications (DB swap, plugin install, test coverage)
- PostgreSQL prerequisites (create DB, user)
- Environment variable requirements
- Collection scaffolding plan (Tenants, Users, Pages, Media)
