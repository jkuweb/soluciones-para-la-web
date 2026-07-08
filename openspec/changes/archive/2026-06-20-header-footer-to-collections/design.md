# Design: Header & Footer — Global to Collection migration

## Technical Approach

Convert two `GlobalConfig` singletons (`globals/{Header,Footer}/config.ts`) into `CollectionConfig` documents registered in the multi-tenant plugin. Each tenant owns exactly one `header` and one `footer` document enforced via a `beforeChange` hook. Field shape is preserved from the current globals; the spec adds `logo`, `ctaText`, `ctaLink` to Header and `navColumns` to Footer as forward-looking additions. Revalidation hooks convert to `CollectionAfterChangeHook`; `RowLabel.tsx` components relocate next to their new parent collection. Both starters switch from `/api/globals/{header,footer}` to a scoped collection query with `?where[tenant.slug][equals]=`.

## Architecture Decisions

### Decision: Tenant uniqueness via beforeChange hook

| Aspect | Detail |
|--------|--------|
| **Choice** | Custom `beforeChange` hook that queries existing docs by tenant and rejects duplicates |
| **Alternatives considered** | DB-level unique index on `(tenant, slug)` — rejected because multi-tenant plugin uses a relationships table, not a direct column |
| **Rationale** | Payload's `CollectionConfig.fields` `unique: true` doesn't compose with plugin-injected relationship fields. A `beforeChange` hook is the Payload-idiomatic pattern used in the ecosystem for cross-field uniqueness |

### Decision: Read access remains fully public

| Aspect | Detail |
|--------|--------|
| **Choice** | `read: () => true` (identical to current globals) |
| **Alternatives considered** | Tenant-filtered read like Pages — rejected because headers/footers are structural chrome fetched by client SSR with no auth |
| **Rationale** | Client sites fetch header/footer at build/request time without authentication. The `?where[tenant.slug][equals]=` on the query string provides tenant isolation; access control is for the admin UI |

### Decision: Collection file layout mirrors Pages convention

| Aspect | Detail |
|--------|--------|
| **Choice** | Flat `collections/Header.ts` + `collections/Header/hooks/` + `collections/Header/RowLabel.tsx` |
| **Alternatives considered** | Single flat file without subdirectory — rejected because `Pages.ts` already uses the hook subdirectory pattern |
| **Rationale** | Consistency with existing `collections/Pages/hooks/` structure. `RowLabel.tsx` co-locates with its owning collection per the codebase's convention of keeping components adjacent to their config |

## Data Flow

```
Client Starter (Astro/Next.js)
  │
  │  GET /api/header?where[tenant.slug][equals]=acme&limit=1&depth=1
  ▼
Payload REST API
  │
  │  collection: 'header', overrideAccess: false, where: { 'tenant.slug': 'acme' }
  ▼
Multi-tenant plugin → scopes query to tenant `acme`
  │
  ▼
PostgreSQL → returns { docs: [{ ...header, tenant: { id:1, slug:'acme' } }] }
  │
  ▼
Client renders header with `.docs[0]?.navItems`
```

`Footer` follows the same flow with `/api/footer?...`.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `agencia-backend/src/collections/Header.ts` | Create | CollectionConfig with slug `header`, fields: `navItems` (link array, max 10), `logo` (upload), `ctaText` (text), `ctaLink` (link), `beforeChange` uniqueness hook, `afterChange` revalidation |
| `agencia-backend/src/collections/Header/hooks/revalidateHeader.ts` | Create | CollectionAfterChangeHook with per-tenant cache tag `header_{tenantSlug}` |
| `agencia-backend/src/collections/Header/RowLabel.tsx` | Create | Moved from `globals/Header/`, import updated to collection type |
| `agencia-backend/src/collections/Footer.ts` | Create | CollectionConfig with slug `footer`, fields: `navItems` (link array), `copyright` (text), `socialLinks` (link array, max 8), `navColumns` (group array), uniqueness hook, revalidation |
| `agencia-backend/src/collections/Footer/hooks/revalidateFooter.ts` | Create | CollectionAfterChangeHook |
| `agencia-backend/src/collections/Footer/RowLabel.tsx` | Create | Moved from `globals/Footer/` |
| `agencia-backend/src/plugins/index.ts` | Modify | Add `header: {}`, `footer: {}` to `multiTenantPlugin.collections` |
| `agencia-backend/src/payload.config.ts` | Modify | Import from `./collections/Header` and `./collections/Footer`; add to `collections` array; remove `globals` array |
| `agencia-backend/src/globals/Header/**` | Delete | Entire directory |
| `agencia-backend/src/globals/Footer/**` | Delete | Entire directory |
| `agencia-backend/src/payload-types.ts` | Regenerate | `pnpm payload generate:types` — `globals` section removed, `Header`/`Footer` in `collections` with `tenant` field |
| `astro-starter/src/lib/payload.ts` | Modify | `getHeader`/`getFooter`: target `/api/{header,footer}?where[tenant.slug][equals]=${TENANT_SLUG}&limit=1&depth=1`, return `data.docs[0]` |
| `astro-starter/src/lib/types.ts` | Modify | Widen `Header`/`Footer` with `id`, `tenant`, `createdAt`, `updatedAt`; add `logo`, `ctaText`, `ctaLink` to Header |
| `nextjs-starter/src/lib/payload.ts` | Modify | Same query change as astro-starter; preserve `next: { revalidate: 60 }` |
| `nextjs-starter/src/lib/types.ts` | Modify | Same type widening as astro-starter |
| `agencia-backend/tests/int/api.int.spec.ts` | Modify | Add: per-tenant read isolation, unauthenticated read, unique-tenant enforcement reject |
| `openspec/specs/multi-tenant-setup/spec.md` | Modify | Delta: add `Header`/`Footer` to tenant-scoped collections requirement |

## Interfaces / Contracts

The collection field shape (Header):

```typescript
// collections/Header.ts fields (preserving + extending current global)
fields: [
  { name: 'navItems', type: 'array', maxRows: 10, fields: [link({ appearances: false })] },
  { name: 'logo', type: 'upload', relationTo: 'media' },
  { name: 'ctaText', type: 'text' },
  { name: 'ctaLink', type: 'group', fields: [link({ appearances: false })] },
]
```

Starter return types widen minimally:

```typescript
// astro-starter / nextjs-starter src/lib/types.ts
export interface Header {
  id: string
  tenant: string | { slug: string }
  navItems: { id: string; link: Link }[]
  logo?: MediaImage
  ctaText?: string
  ctaLink?: Link
  updatedAt?: string
  createdAt?: string
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Integration | Header read isolation: Tenant A's header returned for `?where[tenant.slug][equals]=a`, Tenant B excluded | Vitest: seed two tenants with distinct headers, query each, assert no cross-contamination |
| Integration | Unauthenticated header read returns 200 | Vitest: GET `/api/header?where[tenant.slug][equals]=acme` with no auth cookie |
| Integration | Duplicate tenant creation rejected with 400 | Vitest: create header for tenant 1, attempt second, assert 400 |
| Integration | Footer read isolation (same pattern) | Vitest: mirror header tests for footer |

Tests follow the existing pattern in `tests/int/api.int.spec.ts` using `getPayload({ config })` with the Local API.

## Migration / Rollout

1. **Backup**: Snapshot current global JSON to `agencia-backend/migration-backups/` before deployment
2. **Seed**: After collections are live, seed one empty header/footer per existing dev tenant (idempotent: skip if exists)
3. **Rollback**: Revert `payload.config.ts` globals array, remove `header`/`footer` from plugin collections map, restore `globals/{Header,Footer}/` from backup, regenerate types, restart
4. **Client rollout**: Starter changes propagate via `pnpm sync:clients --apply` (both `src/lib/payload.ts` and `src/lib/types.ts` are in the sync allowlist)

## Open Questions

- [ ] Should Header/Footer support `versions.drafts` like Pages? Deferred to a future change.
- [ ] Should `link.relationTo` be widened to reference Header nav items to allow internal header links? Out of scope.
- [ ] Seed script: run as a Payload migration (`payload migrate:create`) or a standalone script? Decision during implementation.
