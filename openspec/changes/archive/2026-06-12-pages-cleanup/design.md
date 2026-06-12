# Design: pages-cleanup

## Technical Approach

Two mechanical changes to the Pages collection following Payload CMS conventions: (1) co-locate the `validateLayoutStructure` hook with the Pages collection using the collection-as-directory pattern, and (2) add `defaultPopulate` to optimize relationship lookups. No logic changes. Pure file reorganization + one config property.

## Architecture Decisions

### Decision: Hook co-location via collection-as-directory

**Choice**: Move `validateLayoutStructure.ts` from `src/hooks/` to `src/collections/Pages/hooks/`.
**Alternatives considered**: Leave in shared `src/hooks/` (rejected — the hook is Pages-specific; a shared directory with one file provides no value).
**Rationale**: The Payload Website Template uses `collections/Pages/hooks/` for Page-specific hooks. The backend already has an empty `src/collections/Pages/hooks/` directory (created for this purpose). Co-location makes discoverability clearer.

### Decision: defaultPopulate selection

**Choice**: `defaultPopulate: { title: true, slug: true }`
**Alternatives considered**: Include `tenant: true` (rejected — `tenant` is auto-populated by the multi-tenant plugin and does not need explicit population; the proposal and user spec both specify only `title` and `slug`).
**Rationale**: When a Page is referenced as a relationship (e.g., in a Menu block), the API returns only `title` and `slug` by default instead of the full document, reducing payload size.

### Decision: No slug generic on CollectionConfig

**Choice**: Keep `CollectionConfig` (bare, no generic).
**Alternatives considered**: Change to `CollectionConfig<'pages'>` for field-safe `defaultPopulate` typing.
**Rationale**: The backend uses bare `CollectionConfig` consistently across all collections. Changing the Pages generic now would be inconsistent and outside the scope of this cleanup. The `defaultPopulate` value `{ title: true, slug: true }` is type-safe as a `SelectType` on the bare config.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/collections/Pages/hooks/validateLayoutStructure.ts` | Create | Same content as old file — moved from `src/hooks/` |
| `src/collections/Pages.ts` | Modify | Change import path (line 13); add `defaultPopulate` after `admin` block |
| `src/hooks/validateLayoutStructure.ts` | Delete | Replaced by copy in `src/collections/Pages/hooks/` |
| `src/hooks/` | Delete | Empty directory after removal (only file) |
| `tests/int/validateLayoutStructure.int.spec.ts` | Modify | Change import path (line 3) from `@/hooks/validateLayoutStructure` to `@/collections/Pages/hooks/validateLayoutStructure` |

## Data Flow

No change. The hook runs at the same lifecycle point (`beforeChange`) with the same logic. The `defaultPopulate` affects only API serialization when Pages are returned as relationship fields.

    Payload API request (relationship field)
         │
         └── Pages collection config
                │
                └── defaultPopulate: { title, slug }
                       │
                       └── API response: { title, slug } only

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Integration | Hook still validates layout changes | Run existing `validateLayoutStructure.int.spec.ts` — import path update is the only change needed |
| TypeScript | Compilation succeeds | `pnpm typecheck` — both import paths resolve correctly |
| Lint | No new issues | `pnpm lint` |

No new tests needed. The existing integration test covers the hook behavior. The `defaultPopulate` addition is a declarative config change — Payload's framework handles it at the API layer.

## Migration / Rollout

No migration required. No data changes. No feature flags.

### Rollback Plan
1. Restore `validateLayoutStructure.ts` to `src/hooks/` from git
2. Revert import changes in `Pages.ts` and test file
3. Remove `defaultPopulate` from Pages config
4. Delete `src/collections/Pages/hooks/validateLayoutStructure.ts`

## Open Questions

None. All decisions are resolved.
