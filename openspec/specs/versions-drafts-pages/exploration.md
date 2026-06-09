## Exploration: versions-drafts-pages

### Current State
- The `Pages` collection has a manual `status` field (`draft` | `published`) with no built-in versioning.
- Access control is tenant-scoped: `super-admin` sees all; `tenant-admin` / `tenant-editor` only sees pages in their assigned tenants.
- The `validateLayoutStructure` hook restricts layout changes (add/remove/reorder blocks) to `super-admin` only. Metadata-only changes (including `status`) are allowed for tenant-admins.
- Frontends (Astro + Next.js starters) query `?where[status][equals]=published` via REST API. No authentication is used in public frontend queries.
- No versions table exists; there are no migration files in the repo.

### What Payload versions/drafts provides
- **Auto-injected `_status` field**: replaces the manual `status` field. Values: `draft`, `published`, `changed`.
- **Versions table**: `pages_versions` (PostgreSQL) stores a full copy of every version, including metadata about the version.
- **Autosave**: automatically saves draft progress while editing.
- **Schedule publish**: editors can schedule future publish/unpublish events.
- **Draft preview**: allows building preview implementations by reading the latest draft version.
- **Access control**: requires `read` access to filter by `_status` so unauthenticated users only see `published`.

### Affected Areas
- `agencia-backend/src/collections/Pages.ts` — add `versions.drafts`, remove manual `status` field, update `access.read`, update `admin.defaultColumns`.
- `agencia-backend/src/collections/Users.ts` — no direct change, but access control logic changes for `tenant-admin` roles.
- `agencia-backend/src/hooks/validateLayoutStructure.ts` — hook currently skips validation when `!('layout' in data)`. With autosave, `beforeChange` runs frequently; metadata-only edits still pass, but the hook must remain robust against version saves.
- `agencia-backend/src/payload-types.ts` — must be regenerated after config changes.
- `astro-starter/src/lib/payload.ts` — replace `where[status][equals]=published` with `where[_status][equals]=published` (or remove if backend handles access control). However, the backend currently does NOT have public read access control; it returns tenant-scoped pages for any authenticated user. For unauthenticated frontend queries, the backend will need to restrict to `_status: published`.
- `nextjs-starter/src/lib/payload.ts` — same as Astro.
- `agencia-backend/tests/int/validateLayoutStructure.int.spec.ts` — tests reference `status: 'draft'` and `status: 'published'` on the manual field. Need to update to use `_status` or remove explicit status from test data if drafts auto-inject it.
- `agencia-backend/tests/int/api.int.spec.ts` — minimal, but may need updates to reflect `_status` filtering.
- PostgreSQL database — Payload will auto-create `pages_versions` table on next start. Existing `status` column needs migration strategy (drop old column, or migrate values to `_status` before removal). No manual migration files exist; may need to run `payload migrate` or use `beforeSchemaInit` if custom migration is needed.

### Approaches
1. **Minimal migration: enable drafts + drop old status field**
   - Add `versions: { drafts: { autosave: true, schedulePublish: true } }` to Pages.
   - Remove the manual `status` field.
   - Update `access.read` to restrict public (unauthenticated) requests to `_status: published`.
   - Update frontend query params from `status` to `_status`.
   - Update tests.
   - **Pros**: Clean, uses Payload's built-in system fully.
   - **Cons**: Requires data migration for existing pages (old `status` values need to map to `_status`). All existing pages with `status: 'published'` must become `published`; `draft` become `draft`. Need to verify how Payload handles existing documents when drafts are enabled — it may auto-set `_status` based on the old field or leave it as `draft`. Testing required.
   - **Effort**: Medium.

2. **Hybrid: keep old status field temporarily, add drafts alongside**
   - Keep the `status` field for backwards compatibility while adding `versions.drafts`.
   - Add a `beforeChange` hook to sync `status` → `_status`.
   - **Pros**: Zero downtime for frontend queries; gradual migration.
   - **Cons**: Double bookkeeping, confusion for editors, technical debt. The `_status` field is auto-injected and Payload may conflict with a manual field of the same name (or different name). The manual field is `status` while Payload uses `_status`, so they won't conflict, but having two status fields is confusing.
   - **Effort**: Medium-High.

### Recommendation
Approach 1 (Minimal migration). Payload's drafts system is designed to replace manual status fields. The multi-tenant README explicitly warns that with drafts enabled, you need additional read access control to prevent tenant admins from seeing other tenants' draft documents. The current access control already scopes by tenant, so this is mostly covered, but we need to ensure `read` access for unauthenticated users filters by `_status: published`.

### Risks
1. **Data migration**: Existing pages have `status: 'published'` or `'draft'`. When drafts are enabled, Payload injects `_status` but does NOT automatically migrate the old `status` field values. Existing documents may default to `draft` or `published` depending on Payload's behavior. We MUST verify in a test environment or write a migration script.
2. **Multi-tenant + drafts**: The multi-tenant plugin isolates by tenant, but drafts add complexity. The `read` access control must filter by tenant AND `_status` for public users. The multi-tenant README explicitly says: "If you have versions and drafts enabled on your pages, you will need to add additional read access control condition to check the user's tenants that prevents them from accessing draft documents of other tenants." Our current `read` access already checks tenant for non-super-admins, but the public (unauthenticated) path is currently missing (there is no explicit `!user` branch in `read` access).
3. **Frontend query changes**: Astro and Next.js starters use `where[status][equals]=published`. This must be changed to `where[_status][equals]=published`. If we don't change the frontend, published pages will be invisible because the backend drops the old `status` field.
4. **Hook compatibility**: `validateLayoutStructure` uses `beforeChange`. With autosave, this hook runs very frequently. It already handles metadata-only edits correctly (`!('layout' in data)`), but we should verify it doesn't interfere with autosave drafts.
5. **Tenant-admin publish restriction**: Currently tenant-admins can change `status` to `published`. With drafts, the publish action is a UI button. We need to decide if tenant-admins should be allowed to publish or if that should be restricted to super-admin. The current `validateLayoutStructure` hook only guards layout changes, not status. If we want to restrict publishing, we need to add access control logic (e.g., `update` access checking `_status` or user role).
6. **Schedule publish**: Requires Payload's job queue or cron to be active. If not configured, scheduled publish may not execute. Need to verify if the project has `jobs` configured (currently `jobs: { tasks: unknown; workflows: unknown; }` in types, but no actual tasks).

### Open Questions / Blockers
1. **What happens to existing pages when `versions.drafts` is enabled?** Does Payload set `_status` based on existing `status` field, or do all pages default to `draft`? We need to test this.
2. **Should tenant-admins be allowed to publish?** Currently they can change `status`. With drafts, "Publish" is a separate action. If we restrict publishing to super-admin, we need to add `update` access control for `_status`.
3. **Do we need a data migration script?** If Payload does not auto-migrate `status` → `_status`, we need to write one (e.g., using `payload.update` with `overrideAccess: true` across all pages).
4. **Are there any existing client frontends already deployed that would break?** The `status` query param will stop working. This is a breaking change for all frontend starters.
5. **Schedule publish infrastructure**: Do we have `jobs` / cron configured in Payload to handle scheduled publish? If not, enabling `schedulePublish: true` may be misleading (UI shows it but it doesn't execute).

### Ready for Proposal
Yes, but the orchestrator should surface the data migration risk and the tenant-admin publish permission question to the user before moving to the proposal phase. The scope should likely include: enabling drafts, migrating existing `status` data, updating access control, updating frontend query params, and updating tests.
