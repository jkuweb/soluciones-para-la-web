# Agencia SaaS — Agent Guidelines

Guidelines for AI agents working on the Agencia SaaS project.

## Project Overview

Multi-tenant SaaS platform for a web development agency. Each client gets an independent website with their own domain. The developer (super-admin) creates the structure; the client only edits content (text, images).

## Architecture

- **Backend**: Payload CMS 3.85.1 + PostgreSQL (single centralized instance)
- **Frontend**: Separate projects per client (Astro for static sites, Next.js for dynamic shops/academies)
- **Multi-tenancy**: `@payloadcms/plugin-multi-tenant` isolating `pages` and `media` by tenant
- **CSS**: Vanilla CSS / CSS Modules / SCSS per client project. NO Tailwind.
- **Media**: Cloudinary (via `@payloadcms/cloud-storage`)
- **Payments**: Stripe (external, via webhooks)
- **CRM**: Notion/Airtable (external)
- **Deploy**: Vercel / Netlify

## Project Structure

```
agencia/
├── agencia-backend/          # Payload CMS (single backend)
│   ├── src/
│   │   ├── collections/      # Tenants, Users, Pages, Media
│   │   ├── blocks/         # Reusable blocks (HeroBlock, TextBlock, etc.)
│   │   ├── app/            # Next.js App Router (admin + frontend)
│   │   └── payload.config.ts
│   ├── tests/
│   │   ├── int/            # Vitest integration tests
│   │   └── e2e/            # Playwright E2E tests
│   ├── package.json
│   ├── docker-compose.yml   # PostgreSQL service
│   └── vitest.config.mts
├── docs/                    # Architecture design docs
│   └── superpowers/specs/
└── openspec/                # SDD artifacts
    └── config.yaml
```

**NOTE**: Client frontends are NOT in this repo. They are separate projects generated from a template. This repo only contains the centralized backend.

## Code Conventions

### TypeScript

- **Strict mode**: enabled (`strict: true` in tsconfig)
- **Target**: ESNext
- **Module resolution**: `bundler`
- **NoEmit**: `true` — run `pnpm typecheck` for validation

### Naming

- **Collections**: `PascalCase` (e.g., `Tenants`, `Users`, `Pages`, `Media`)
- **Blocks**: `PascalCase` with `Block` suffix (e.g., `HeroBlock`, `TextBlock`, `MenuBlock`)
- **Files**: `kebab-case.ts` for config/utils, `PascalCase.tsx` for React components
- **Variables**: `camelCase`
- **Constants**: `SCREAMING_SNAKE_CASE`

### Payload Blocks

- Every block MUST have a `slug` property matching the kebab-case version of the name (e.g., `HeroBlock` → `slug: 'hero'`)
- Fields use `type` and `name` as required by Payload
- `relationTo` always references the collection slug string

### CSS

- **NO Tailwind** in any project
- Client frontends use Vanilla CSS, CSS Modules, or SCSS per project
- CSS files live alongside their components: `ComponentName/styles.css` or `ComponentName/styles.module.css`
- Variables in `styles/variables.css`

## Testing

- **Integration**: Vitest (`pnpm test` or `pnpm test:int`)
- **E2E**: Playwright (`pnpm test:e2e`)
- **Coverage**: `vitest run --coverage` (via `@vitest/coverage-v8`)
- **Quality**: `pnpm lint` (ESLint), `pnpm typecheck` (TypeScript), `pnpm prettier --check .` (formatting)

### Test Rules

- Integration tests: `*.int.spec.ts` in `tests/int/`
- E2E tests: `*.spec.ts` in `tests/e2e/`
- Always seed data needed for the test; clean up after

## Environment

- **Node.js**: >= 20.9.0 (package.json engines allow 18.20.2+ but target 20+)
- **Package manager**: pnpm (required)
- **Database**: PostgreSQL (local via Docker or hosted)
- **Docker compose**: `docker-compose.yml` in `agencia-backend/` uses PostgreSQL

### Required Environment Variables

```bash
# .env.example
PAYLOAD_SECRET=<random-32-char-hex>
DATABASE_URL=postgresql://user:pass@localhost:5432/agencia_dev
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
# Cloudinary (optional for now)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Key Decisions

1. **Client CSS lives in the client's repo**, NOT in the backend database. Each client frontend is a separate project with its own styles.
2. **Backend is single-instance**: All tenants share one Payload CMS instance. The plugin isolates data.
3. **Astro for static sites**, **Next.js for dynamic sites** (shops, academies). No mixing within a single project.
4. **No Tailwind** — ever. Design is fully custom per client.
5. **Stripe and Notion/Airtable are external** — do NOT build CRM or payment logic into Payload.

## Workflow for Adding Features

1. Check `docs/superpowers/specs/2026-06-08-agencia-saas-design.md` for architecture decisions
2. Update `openspec/` if following SDD process
3. Write tests for integration changes
4. Run `pnpm typecheck` and `pnpm lint` before committing
5. Do NOT run `git commit` or `git push` unless explicitly asked

## Docker

- Use `docker-compose up` in `agencia-backend/` to start PostgreSQL
- The `postgres` service uses environment variables with defaults: `POSTGRES_USER=agencia`, `POSTGRES_PASSWORD=agencia`, `POSTGRES_DB=agencia_dev`
- The `payload` service depends on `postgres` and loads `.env`

## Frontend Client Projects (Out of Scope)

- **Astro starter template**: `astro-starter/` (separate repo)
- **Next.js starter template**: `nextjs-starter/` (separate repo)
- Each client project connects to the backend via Payload REST API
- Tenant isolation via `?where[tenant][equals]=<slug>` in API calls

## Template → Client Sync

Templates live in this monorepo (`astro-starter/`, `nextjs-starter/`), but each client is a separate project at `/home/joseba/Clientes/clientes/<slug>/`. When you change a template, existing clients don't pick up the change automatically. Two scripts propagate updates without overwriting client-specific work.

### Quick path

1. Change code in `astro-starter/` or `nextjs-starter/`.
2. Dry-run for one client: `pnpm sync:client --slug=<client-slug> --verbose`.
3. Review the diff. The output is grouped as `[new]`, `[change]`, `[skip]`.
4. Apply: `pnpm sync:client --slug=<client-slug> --apply`.
5. Build and test the client locally.
6. Commit the client repo. Remove the `.bak-<ts>` files left by the sync (or add them to the client's `.gitignore`) before committing.
7. For dependency bumps, run the same dry-run → review → apply → test flow with `pnpm update:client --slug=<client-slug> --apply`.

### What `sync:client` syncs

Only files in a curated allowlist are candidates for sync. Everything else is left alone. A blocklist is always protected.

| Group                     | Files                                                                                                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Astro allowlist           | `astro.config.mjs`, `tsconfig.json`, `src/lib/{payload,types,lexical}.ts`, `src/components/BlockRenderer.astro`, `src/layouts/Layout.astro`, `src/pages/{[slug],index,404}.astro` |
| Next.js allowlist         | `next.config.ts`, `tsconfig.json`, `src/lib/{payload,types,lexical}.ts`, `src/components/BlockRenderer.tsx`, `src/app/{layout,page,not-found}.tsx`, `src/app/[slug]/page.tsx`     |
| Blocklist (never touched) | `src/styles/*.css`, `src/components/blocks/*`, `src/components/**/styles.css`, `.env`, `.env.example`, `.env.local`, `node_modules/`, `dist/`, `.next/`, `.astro/`, `public/`     |

Both modes (dry-run and apply) honour the allowlist and blocklist. On apply, every changed file is backed up as `<file>.bak-<unix-ts>` next to itself.

### What `update:client` merges

Merges `package.json` between the template and the client. Read the output: `+` is added, `~` is updated, `=` is kept at the client value, `-` is removed.

| Field                             | Resolution                                                             |
| --------------------------------- | ---------------------------------------------------------------------- |
| `name`, `version`, `description`  | Client wins                                                            |
| `type`, `engines`, `pnpm`         | Template wins                                                          |
| `scripts`                         | Merged; client wins on conflict                                        |
| `dependencies`, `devDependencies` | Merged; client wins on conflict                                        |
| Template-only entries             | Added (`+`)                                                            |
| Client-only entries               | Kept and reported as added (because they survive in the merged output) |

On apply, the client's `package.json` is backed up to `package.json.bak-<unix-ts>` and then `pnpm install --no-frozen-lockfile` runs in the client directory. Use `--skip-install` to defer the install (e.g. when you'll combine with other changes).

### Bulk operations: `sync:clients` and `update:clients`

When you want to apply template changes to **all** clients in one shot:

1. Dry-run for everyone: `pnpm sync:clients --filter=outdated` — skips clients that are already up-to-date.
2. Review the summary table. It shows file counts per client and any errors.
3. Apply: `pnpm sync:clients --apply` (or `--apply --filter=outdated` to only touch the outdated ones).
4. Same flow for dependencies: `pnpm update:clients` (dry-run) → `pnpm update:clients --apply`.

Flags for both:

| Flag | Default | Meaning |
|------|---------|---------|
| `--apply` | `false` | Execute the changes. Without it → dry-run. |
| `--filter=outdated` | `all` | Skip clients with zero changes. |
| `--template=astro\|nextjs` | auto | Override the auto-detect from `package.json#name`. |

`update:clients` also accepts `--skip-install` to defer `pnpm install` (useful when you'll batch with other changes).

Exit code is `0` if everything succeeded, `1` if any client errored. Errors don't stop the batch — each client is processed independently and reported in the summary.

### Template version tracking

Every client bootstrapped via `pnpm create-client` writes a `.template-version.json` at the client root:

```json
{
  "template": "astro",
  "version": "1.0.0",
  "installedAt": "2026-06-17T20:00:00.000Z"
}
```

The `template` and `version` come from the template's `package.json` (`name` without the `-starter` suffix, plus `version`). The file is updated by `update:client --apply` and `update:clients --apply` (best-effort, only if the file already exists with valid JSON). The `lastSyncedAt` field records the last sync. `sync:client` and `sync:clients` do not touch it — file sync is independent from version tracking.

For clients that pre-date this feature, backfill the file manually by reading the corresponding `<template>-starter/package.json` from the monorepo at the time the client was created. The format must match exactly (idempotent rewrite is safe).

### Auto-detect vs explicit template

Both scripts auto-detect the template from the client's `package.json#name` (`astro-starter` or `nextjs-starter`). If detection fails — e.g. the client renamed its package — pass `--template=astro` or `--template=nextjs` explicitly.

### Workflow checklist

- [ ] Dry-run completed and diff reviewed for the intended client(s).
- [ ] Applied only the intended client(s) — repeat per slug if multiple clients need the change.
- [ ] Client builds (`pnpm build` or equivalent) and renders correctly after sync/update.
- [ ] Client-specific files (styles, content, `.env`, `public/`) untouched.
- [ ] `pnpm install` ran after `update:client` (or `--skip-install` was deliberate).
- [ ] `.bak-<ts>` backups removed from the client working tree before commit.
- [ ] Client repo committed with a message that names the synced files.

### References

- Scripts: `agencia-backend/scripts/sync-template.ts`, `agencia-backend/scripts/update-deps.ts`, `agencia-backend/scripts/lib/template-version.ts`
- Wrapper: `agencia-backend/scripts/loaders/run-with-css.mjs` (strips CSS imports when running scripts through `tsx`)
- Design doc: `docs/superpowers/specs/2026-06-17-create-client-script-design.md`

## Security

- CORS is open by default (dynamic domains). Consider a whitelist for production.
- Media uploads: only image MIME types (JPEG, PNG, GIF, WebP). Max 5MB.
- Forbidden file extensions: `.exe`, `.bat`, `.sh`, `.php`, `.js`
- SVG uploads require sanitization + CSP headers (not implemented yet)
- All webhooks must verify HMAC signatures (e.g., Stripe)
- HTTPS required in production

## Payload Collections

| Collection | Auth | Upload | Multi-tenant  | Notes                                                 |
| ---------- | ---- | ------ | ------------- | ----------------------------------------------------- |
| `Users`    | Yes  | No     | Auto (plugin) | Roles: `super-admin`, `tenant-admin`, `tenant-editor` |
| `Tenants`  | No   | No     | No            | Defines tenant domain, type, status, pricing          |
| `Pages`    | No   | No     | Yes           | Layout blocks, status (draft/published)               |
| `Media`    | No   | Yes    | Yes           | Images only. Cloudinary adapter planned.              |

## Multi-tenant Plugin Config

```typescript
multiTenantPlugin<Config>({
  collections: {
    pages: {},
    media: {},
  },
  tenantsSlug: 'tenants',
  userHasAccessToAllTenants: (user) => {
    return user?.roles?.includes('super-admin') ?? false
  },
})
```

## Common Commands

```bash
cd agencia-backend

# Install
pnpm install

# Dev
pnpm dev

# Tests
pnpm test        # Integration (Vitest)
pnpm test:e2e    # E2E (Playwright)

# Quality
pnpm lint        # ESLint
pnpm typecheck   # TypeScript
pnpm prettier --check .   # Format check

# Payload
pnpm payload generate:types
pnpm payload generate:importmap

# Client management (run from agencia-backend)
pnpm create-client                                   # Bootstrap a new client (interactive)
pnpm sync:client --slug=<client-slug>                # Dry-run: diff template vs client
pnpm sync:client --slug=<client-slug> --apply        # Apply allowlisted file sync (creates .bak-<ts>)
pnpm sync:client --slug=<client-slug> --verbose      # Add line-level diffs to the dry-run output
pnpm update:client --slug=<client-slug>              # Dry-run: package.json merge + pnpm install
pnpm update:client --slug=<client-slug> --apply      # Write merged package.json and run pnpm install
pnpm update:client --slug=<client-slug> --skip-install   # Write package.json only, skip pnpm install
pnpm sync:clients --filter=outdated            # Dry-run: sync files for all clients (skip clean)
pnpm sync:clients --filter=outdated --apply    # Apply file sync to all outdated clients
pnpm update:clients --filter=outdated          # Dry-run: update deps for all clients
pnpm update:clients --filter=outdated --apply  # Apply dep updates to all outdated clients
```

## References

- [Payload Multi-Tenant Plugin](https://payloadcms.com/docs/plugins/multi-tenant)
- [Payload Multi-Tenant Example](https://github.com/payloadcms/payload/tree/main/examples/multi-tenant)
- [Architecture Design Doc](docs/superpowers/specs/2026-06-08-agencia-saas-design.md)
