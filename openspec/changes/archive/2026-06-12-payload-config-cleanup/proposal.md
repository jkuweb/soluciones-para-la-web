# Proposal: Payload Config Cleanup

## Intent

Tighten Payload CMS configuration security and improve maintainability by explicitly defining CORS/CSRF origins and extracting plugin configuration into a dedicated module.

## Scope

### In Scope
- Add `cors` and `csrf` keys to `payload.config.ts` using `getServerUrl()` from `src/utilities/getURL`
- Create `src/plugins/index.ts` to export a `plugins` array
- Move `multiTenantPlugin` configuration from `payload.config.ts` into `src/plugins/index.ts`
- Import the `plugins` array in `payload.config.ts`

### Out of Scope
- Adding new plugins (Stripe, Cloudinary, etc.)
- Changing multi-tenant plugin behavior or collection isolation rules
- Adding new utilities or configuration files

## Capabilities

### New Capabilities
None — this is a pure refactor and configuration hardening.

### Modified Capabilities
None — no spec-level behavior changes.

## Approach

1. Import `getServerUrl` into `payload.config.ts` and set `cors: [getServerUrl()]` and `csrf: [getServerUrl()]`
2. Move the existing `multiTenantPlugin(...)` call and its configuration object into a new `src/plugins/index.ts` file that exports a `plugins` array
3. Replace the inline plugin configuration in `payload.config.ts` with an import of the `plugins` array

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `payload.config.ts` | Modified | Adds CORS/CSRF; imports plugins array |
| `src/plugins/index.ts` | New | Centralized plugin exports |
| `src/utilities/getURL.ts` | Used (no change) | Reuses existing `getServerUrl()` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `getServerUrl()` returns wrong origin | Low | Verify `NEXT_PUBLIC_SERVER_URL` is set; test in dev/staging |
| Plugin import path is incorrect | Low | Run `pnpm typecheck` after change |
| CSRF breaks admin login | Low | Test login flow in dev; rollback config if needed |

## Rollback Plan

1. Revert `payload.config.ts` to the previous commit (or restore from git)
2. Delete `src/plugins/index.ts`
3. Restart dev server and verify admin access works

## Dependencies

- `getServerUrl()` must already exist in `src/utilities/getURL.ts` (confirmed)

## Success Criteria

- [ ] `payload.config.ts` compiles without errors (`pnpm typecheck`)
- [ ] Dev server starts and admin login succeeds
- [ ] `src/plugins/index.ts` exports the `multiTenantPlugin` in a `plugins` array
- [ ] No functional regression in tenant data isolation
