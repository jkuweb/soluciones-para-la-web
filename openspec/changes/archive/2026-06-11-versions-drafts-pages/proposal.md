# Proposal: Enable Payload Versions/Drafts for Pages

## Intent

Replace the manual `status` field on `Pages` with Payload's native `versions.drafts` so tenant-admins get autosave, draft history, and publish controls.

## Scope

### In Scope
- Enable `versions.drafts` with `autosave`
- Remove manual `status` field and migrate data to `_status`
- Update `read` access to filter public requests by `_status: published`
- Update frontend query params (`status` → `_status`)
- Update integration tests
- Verify `validateLayoutStructure` hook compatibility with autosave
- **Scheduled publish** with job queue configuration
- **Railway deployment** for backend with job worker

### Out of Scope
- `Posts` or other collections
- SEO plugin
- Draft preview UI
- Frontend hosting (Astro/Next.js client sites stay on Vercel/Netlify)

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `pages`: Draft workflow replaces manual status. Public read filters by `_status`.

## Approach

Minimal migration:
1. Add `versions.drafts` to `Pages` config with `autosave: { interval: 1000 }` and `maxPerDoc: 50`.
2. Add `jobs` configuration to `payload.config.ts` with CRON access for scheduled publish.
3. Remove manual `status` field.
4. Migrate existing `status` → `_status` via script.
5. Update `read` access: public = `_status: published`; authenticated = tenant-scoped.
6. Update frontend queries and tests.
7. Configure Railway job worker service to run `payload jobs:run`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/collections/Pages.ts` | Modified | Drafts config, remove `status`, update access |
| `astro-starter/src/lib/payload.ts` | Modified | Query param change |
| `nextjs-starter/src/lib/payload.ts` | Modified | Query param change |
| `tests/int/` | Modified | Replace `status` with `_status` in test data |
| PostgreSQL | New table | `pages_versions` auto-created |

## Business Rules

| Role | Permission |
|------|------------|
| `super-admin` | Full CRUD + publish across all tenants |
| `tenant-admin` | Edit content, publish pages in their tenant; cannot change layout structure |
| Public users | Read only `_status: published` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Data migration: `status` not auto-mapped | High | Migration script; test on backup |
| Frontend break: `status` query stops working | High | Update starters before deploy; E2E verify |
| Multi-tenant leak: drafts visible across tenants | Med | Enforce tenant + `_status` filtering |
| Hook conflict: autosave vs `validateLayoutStructure` | Low | Test metadata-only saves |

## Rollback Plan

Revert `Pages.ts` to restore manual `status`, reverse-migrate data, drop `pages_versions` table, and revert frontend query params.

## Success Criteria

- [ ] Tenant-admin can edit, autosave, and publish.
- [ ] Public requests return only published pages.
- [ ] Existing pages retain state after migration.
- [ ] Integration tests pass.

## Proposal Question Round

- **Q1**: Should tenant-admins publish, or restrict to super-admin?
- **Q2**: Enable scheduled publish? If yes, who sets up the job queue?
- **Q3**: Is 50 versions/page acceptable, or unlimited?

**Assumptions if unanswered**: tenant-admin can publish; schedule publish out of scope; `maxPerDoc: 50` with `autosave: true`.
