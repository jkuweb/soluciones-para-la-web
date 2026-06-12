# Design: Payload Config Cleanup

## Technical Approach

Two isolated refactors in `payload.config.ts`: (1) add explicit CORS/CSRF origin using the existing `getServerUrl()` utility; (2) extract the `multiTenantPlugin` configuration into a dedicated `src/plugins/index.ts` module for cleaner separation.

## Architecture Decisions

### Decision: CORS/CSRF origin source

**Choice**: Use `getServerUrl()` from `src/utilities/getURL.ts`
**Alternatives considered**:
- Hardcoding `http://localhost:3000` — fragile across environments
- Reading `NEXT_PUBLIC_SERVER_URL` directly — duplicates logic already in `getServerUrl()`
**Rationale**: `getServerUrl()` already handles the env-var fallback chain (`NEXT_PUBLIC_SERVER_URL` → `PAYLOAD_PUBLIC_SERVER_URL` → `http://localhost:3000`) and strips trailing slashes. Single source of truth for server origin.

### Decision: Plugin extraction target

**Choice**: `src/plugins/index.ts` exporting a `plugins` array
**Alternatives considered**:
- Inline in `payload.config.ts` (current) — pollutes the config file as plugins grow
- `src/payload-plugins.ts` — violates kebab-case convention for non-component files
**Rationale**: `src/plugins/` is the natural home for plugin configuration. Barrel export (`index.ts`) lets the directory grow with per-plugin files later (e.g., `cloudinary.ts`, `stripe.ts`).

### Decision: User type in callback

**Choice**: Import `User` from `@/payload-types` and type the callback parameter
**Alternatives considered**:
- `any` typed parameter — loses type safety
- Inline `{ roles?: string }` — not aligned with generated types
**Rationale**: The project already uses `@/payload-types` for `User` in `src/utilities/resolveTenantIds.ts`. Note: `roles` is a union of literal strings (`'super-admin' | 'tenant-admin' | 'tenant-editor'`), and the existing `.includes()` call works via `String.prototype.includes` — not `Array.includes`. This is valid and preserved.

## Data Flow

No data flow changes — this is configuration-only.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/plugins/index.ts` | Create | Exports `plugins` array containing `multiTenantPlugin` config |
| `src/payload.config.ts` | Modify | Add `getServerUrl` import, `cors`/`csrf` keys; replace inline plugin with `...plugins` import |

## Interfaces / Contracts

### `src/plugins/index.ts` exports

```typescript
import type { Config } from 'payload'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import type { User } from '@/payload-types'

export const plugins: Config['plugins'] = [
  multiTenantPlugin<Config>({
    collections: { pages: {}, media: {} },
    tenantsSlug: 'tenants',
    userHasAccessToAllTenants: (user: User) => {
      return user?.roles?.includes('super-admin') ?? false
    },
    tenantField: {
      admin: { disableListColumn: false, disableListFilter: false },
    },
  }),
]
```

### `payload.config.ts` changes

```typescript
import { getServerUrl } from './utilities/getURL'
import { plugins } from './plugins'

// Inside buildConfig({...}):
//   Add: cors: [getServerUrl()], csrf: [getServerUrl()]
//   Replace inline plugins array with: plugins: [...plugins]
//   Remove: import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Type check | Compilability | `pnpm typecheck` — no errors |
| Integration | Admin login | Manual: start dev server, log in to admin panel |
| Integration | CORS behavior | Manual: verify admin API calls succeed (same-origin in dev) |

No unit tests needed — pure config refactor with no runtime logic changes.

## Migration / Rollout

No migration required. Rollback: revert `payload.config.ts`, delete `src/plugins/index.ts`.

## Open Questions

None — all decisions are straightforward.
