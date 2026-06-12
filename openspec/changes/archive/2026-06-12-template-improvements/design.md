# Design: Template Improvements — Reusable Access & Utilities

## Technical Approach

Extract duplicated access-control logic into factory functions in `src/access/` and add two utilities in `src/utilities/`. No API or DB changes. Collections/globals will consume these factories in a future change; this change creates the factories only.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| Tenant ID extraction | Standalone export `resolveTenantIds` in `src/utilities/` | Inline in tenantAccess | Testable independently. Keeps tenantAccess focused on Payload's access contract. |
| deepMerge array detection | Check source first element: if non-null object → merge by index; else replace | Separate `mergeArrays` param, or always-replace | Auto-detection avoids API surface changes. Covers 100% of real-world Payload field overrides. |
| getURL missing var | `console.warn` + localhost fallback at call time | Build-time error, or silent fallback | Can't enforce build-time for runtime env vars. Warning makes missing config visible in dev/prod logs. |
| `anyone` return shape | `() => true` | `() => ({})` | Spec requires unconditional grant. Returning `true` (boolean) is idiomatic Payload for "granted with no query constraint." |

## File Changes

| File | Action | Description |
|---|---|---|
| `src/access/anyone.ts` | Create | `() => true` factory for public globals/collections |
| `src/access/authenticated.ts` | Create | Checks `req.user` exists; denies unauthenticated |
| `src/access/authenticatedOrPublished.ts` | Create | Authenticated → all docs; public → only `_status: 'published'` |
| `src/access/tenantAccess.ts` | Create | Tenant-constrained factory. Calls `resolveTenantIds`. |
| `src/utilities/resolveTenantIds.ts` | Create | Extracts string IDs from polymorphic `user.tenants[].tenant` |
| `src/utilities/deepMerge.ts` | Modify | Add array-of-objects merge logic |
| `src/utilities/getURL.ts` | Create | `NEXT_PUBLIC_SERVER_URL` resolver with strip + fallback |

## Interfaces / Contracts

### `resolveTenantIds(tenants) → string[]`

Handles three tenant shapes found across Pages, Media, Tenants:
```typescript
// Type guard
function isPopulatedTenant(v: unknown): v is { id: string | number } {
  return typeof v === 'object' && v !== null && 'id' in v
}

export function resolveTenantIds(
  tenants: { tenant: string | number | { id: string | number } }[],
): string[] {
  return tenants.map((t) => {
    if (typeof t.tenant === 'string') return t.tenant
    if (typeof t.tenant === 'number') return String(t.tenant)
    if (isPopulatedTenant(t.tenant)) return String(t.tenant.id)
    return ''
  }).filter(Boolean)
}
```

### `tenantAccess(fieldName = 'tenant') → Access`

- Super-admin → `true`
- No user → `false`
- Otherwise → `{ [fieldName]: { in: resolveTenantIds(user.tenants) } }`

### `deepMerge` array logic

```
sourceArr[0] is non-null object? → merge by index (recurse into each pair)
else                            → replace target with source
```

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | `resolveTenantIds` — all 3 types + empty + mixed | Vitest, pure function, no Payload dependency |
| Unit | `deepMerge` — arrays of objects, primitives, empty, null/undefined | Vitest, pure function |
| Unit | `getURL` — set, missing, trailing slash | Vitest, mock `process.env` |
| Integration | `tenantAccess` — super-admin, tenant-user, unauthenticated | Vitest with Payload test helpers |
| Integration | `authenticatedOrPublished` — auth vs public query shape | Vitest with Payload test helpers |

## Migrations / Rollout

No migration required. New files are additive. Existing collections continue using inline access functions until a future change refactors them to consume the factories.

## Open Questions

- None
