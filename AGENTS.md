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

## Security

- CORS is open by default (dynamic domains). Consider a whitelist for production.
- Media uploads: only image MIME types (JPEG, PNG, GIF, WebP). Max 5MB.
- Forbidden file extensions: `.exe`, `.bat`, `.sh`, `.php`, `.js`
- SVG uploads require sanitization + CSP headers (not implemented yet)
- All webhooks must verify HMAC signatures (e.g., Stripe)
- HTTPS required in production

## Payload Collections

| Collection | Auth | Upload | Multi-tenant | Notes |
|------------|------|--------|-------------|-------|
| `Users` | Yes | No | Auto (plugin) | Roles: `super-admin`, `tenant-admin`, `tenant-editor` |
| `Tenants` | No | No | No | Defines tenant domain, type, status, pricing |
| `Pages` | No | No | Yes | Layout blocks, status (draft/published) |
| `Media` | No | Yes | Yes | Images only. Cloudinary adapter planned. |

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
```

## References

- [Payload Multi-Tenant Plugin](https://payloadcms.com/docs/plugins/multi-tenant)
- [Payload Multi-Tenant Example](https://github.com/payloadcms/payload/tree/main/examples/multi-tenant)
- [Architecture Design Doc](docs/superpowers/specs/2026-06-08-agencia-saas-design.md)
>>>>>>> cf5ada0 (feat: add multi-tenant access control, PostgreSQL, and client bootstrap)
