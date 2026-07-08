# Proposal: Header & Footer — Global to Collection migration

## Intent

`Header` and `Footer` are `GlobalConfig` singletons in `agencia-backend/src/globals/{Header,Footer}/config.ts`. Globals bypass the multi-tenant plugin, so every client renders the same nav, copyright, and social links. Migrate both to singleton-per-tenant collections so each tenant owns its own header and footer.

## Scope

### In Scope
- New `collections/Header.ts` and `Footer.ts` (CollectionConfig) preserving current field shape.
- Register `header` and `footer` in `multiTenantPlugin.collections`; swap `globals` for `collections` in `payload.config.ts`.
- Move `RowLabel.tsx` next to each new collection; convert revalidation hooks to `CollectionAfterChangeHook` with per-tenant cache tags.
- Regenerate `payload-types.ts`; clean up the `globals.header/footer` exports.
- Update both starters' `payload.ts` to fetch `/api/header?where[tenant.slug][equals]=${TENANT_SLUG}&limit=1&depth=1`; widen return types with `id`, `tenant`, timestamps.
- Add integration coverage: per-tenant read isolation, unauthenticated read, unique-tenant enforcement.
- Snapshot current global JSON to `migration-backups/`; seed an empty header/footer per dev tenant.

### Out of Scope
- Rolling the starter change to live clients — separate `pnpm sync:clients --apply` wave.
- Cross-tenant validation for `link.relationTo: ['pages']` — known limitation, deferred.
- Header/Footer versioning, drafts, A/B variants — not needed today.

## Capabilities

### New Capabilities
- `site-chrome`: Tenant-scoped `Header` and `Footer` collections carrying nav items, copyright, and social links.

### Modified Capabilities
- `multi-tenant-setup`: Add `Header` and `Footer` to the "Tenant-scoped collections" requirement.

## Approach

Define `collections/Header.ts` and `Footer.ts` reusing the `link` field factory. Enforce tenant uniqueness via a `beforeChange` hook (the plugin's tenant field is a relationship, not unique by default). Register in `payload.config.ts` and `plugins/index.ts`. Delete `globals/{Header,Footer}/`; move `RowLabel.tsx` next to the new collection. Regenerate `payload-types.ts`. Update both starters' `getHeader`/`getFooter`; layouts already use `?.`, so the wider return type is non-breaking. Add `tests/int/api.int.spec.ts` coverage and seed empty docs.

## Affected Areas

| Area | Impact |
|------|--------|
| `agencia-backend/src/globals/{Header,Footer}/**` | Removed |
| `agencia-backend/src/collections/{Header,Footer}.ts` | New |
| `agencia-backend/src/{payload.config,plugins/index}.ts` | Modified — globals→collections + plugin map |
| `agencia-backend/src/payload-types.ts` | Regenerated — clean up `globals.*` exports |
| `agencia-backend/tests/int/api.int.spec.ts` | Modified — isolation + uniqueness coverage |
| `astro-starter` + `nextjs-starter` `src/lib/{payload,types}.ts` | Modified — tenant-scoped query + types |
| `openspec/specs/multi-tenant-setup/spec.md` | Delta — add Header/Footer |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Dev tenants lose their global on migration | High | Snapshot to `migration-backups/`; seed empty docs per tenant |
| Old `/api/globals/header` URL breaks clients not yet on the new `payload.ts` | High | Roll the starter change first via `pnpm sync:clients --apply`, or add a proxy shim |
| `unique` on `tenant` needs a DB-level index the schema doesn't provide | Med | Enforce uniqueness in a `beforeChange` hook |
| `payload-types.ts` churn affects downstream `src/lib/types.ts` | Med | Widen hand-rolled types with optional `id` and `tenant` |
| Cross-tenant page reference inside `link.relationTo: ['pages']` returns 404 on the wrong tenant | Low | Document as known limitation |

## Rollback Plan

Revert `payload.config.ts` to `globals: [Header, Footer]`; remove `header`/`footer` from the plugin's collections map; restore `globals/{Header,Footer}/` from `migration-backups/`; regenerate `payload-types.ts`; revert both starters' `payload.ts`; restart and verify.

## Dependencies

`@payloadcms/plugin-multi-tenant` already installed. Existing access helpers (`tenantAccess`, `superAdminOnly`, `anyone`, `authenticated`). `pnpm sync:client` / `sync:clients` for client roll-out.

## Success Criteria

- [ ] `Header` and `Footer` no longer appear under `globals` in `payload-types.ts`.
- [ ] Two distinct tenants each have isolated `header` and `footer` documents.
- [ ] `GET /api/header?where[tenant.slug][equals]=acme&limit=1` returns only the `acme` tenant's header.
- [ ] `pnpm test` passes with the new coverage; both starters build green.
- [ ] Delta spec for `multi-tenant-setup` lists `Header` and `Footer` as tenant-scoped.
