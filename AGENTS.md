# Repository Overview

Payload 3.0 + Next.js 16 + PostgreSQL blanket template. Custom admin panel at `/admin`.

## Commands

```bash
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm generate:types  # After changing collections/globals
pnpm generate:importmap  # After creating/changing components
pnpm lint            # ESLint
pnpm test            # Runs vitest (int) + playwright (e2e)
pnpm test:int        # Unit/integration tests only
pnpm test:e2e        # E2E tests only
```

## Important Notes

- **Database**: Uses PostgreSQL (`@payloadcms/db-postgres`), not MongoDB. Ignore the mongodb URL in `.env.example` - use `DATABASE_URL=postgres://...` instead.
- **Routes**: Frontend routes in `src/app/(frontend)/`, admin routes in `src/app/(payload)/admin/`.
- **Type generation**: Run `pnpm generate:types` after modifying collections, globals, or fields.
- **Import maps**: Run `pnpm generate:importmap` after creating or modifying React components.

## Testing

- **Vitest**: Integration tests in `vitest.config.mts`
- **Playwright**: E2E tests, config in `playwright.config.ts`
- Tests require a running dev server (`pnpm dev` in background).

## Code Quality

- Prettier config at `.prettierrc.json`
- ESLint config at `eslint.config.mjs`
- TypeScript strict mode enabled
