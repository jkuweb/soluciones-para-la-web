# Design: Versions/Drafts for Pages

## Technical Approach

Replace the manual `status` select field with Payload's native `versions.drafts`, enabling autosave, draft history (50 versions/doc), and scheduled publish. Migration script converts legacy `status` values to `_status`. Frontend queries switch from `where[status]` to `where[_status]`. Railway deploys two services: main app (API/admin) and job worker (scheduled publish processor).

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Payload native `versions.drafts` vs custom draft workflow | Custom: full control but duplicates Payload internals. Native: zero-code drafts, autosave, publish button, schedule in Admin UI | **Native `versions.drafts`** — already built into Payload 3.85.1 |
| `schedulePublish: true` vs manual job task | Manual: custom handler. Native: Payload integrates `_publishOn` field in admin UI, auto-queues internal jobs | **`schedulePublish: true`** — zero custom job code needed |
| Worker as separate Railway service vs in-app `autoRun` | In-app: simpler, one service. Separate: isolates heavy jobs, scales independently | **Separate worker** — `ENABLE_JOBS=true` env var; main app sets `shouldAutoRun: false` |
| Migration: script vs manual re-publish | Manual: no code but loses state. Script: preserves existing published pages | **Migration script** using `payload.update()` with `_status: 'published'` |

## Data Flow

```
Admin User edits page → autosave (1000ms) → pages_versions (draft)
                        ↓ publish click
                   _status → 'published' → pages row updated
                        ↓ schedule
                   _publishOn set → job queued → worker cron (*/1 * * * *) → publishes at time
                                                            
Public request → GET /api/pages?where[_status]=published → only published versions
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `agencia-backend/src/collections/Pages.ts` | Modify | Add `versions.drafts`, remove `status` field, update `access.read` for public `_status` filter, update `admin.defaultColumns` |
| `agencia-backend/src/payload.config.ts` | Modify | Add `jobs.autoRun` for scheduled publish, `shouldAutoRun` gated by `ENABLE_JOBS` env |
| `agencia-backend/src/migrations/001-status-to-versions.ts` | Create | One-time script: reads old `status`, sets `_status: 'published'` where applicable |
| `astro-starter/src/lib/payload.ts` | Modify | Query param: `where[status]` → `where[_status]` |
| `nextjs-starter/src/lib/payload.ts` | Modify | Query param: `where[status]` → `where[_status]` |
| `astro-starter/src/lib/types.ts` | Modify | Remove `status` from `Page` interface |
| `nextjs-starter/src/lib/types.ts` | Modify | Remove `status` from `Page` interface |
| `agencia-backend/tests/int/validateLayoutStructure.int.spec.ts` | Modify | Replace `status` with `_status` in test data |
| `agencia-backend/tests/int/api.int.spec.ts` | Modify | Add public-read-only-published test |
| `agencia-backend/railway.toml` or Railway UI | Configure | Two services: `backend` + `worker` (ENABLE_JOBS=true) |

## Interfaces / Contracts

**Pages collection config** (key changes):
```ts
export const Pages: CollectionConfig = {
  slug: 'pages',
  versions: {
    drafts: {
      autosave: { interval: 1000 },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
  access: {
    read: ({ req: { user } }) => {
      if (user) {
        if (user.roles.includes('super-admin')) return true
        return { tenant: { in: /* tenant-scoped */ } }
      }
      return {
        and: [
          { _status: { equals: 'published' } },
          // tenant filter from multi-tenant plugin handles tenant isolation
        ]
      }
    },
    // create, update, delete: unchanged
  },
  // status field REMOVED; _status auto-managed by Payload
  admin: {
    defaultColumns: ['title', 'tenant', 'slug', '_status', 'updatedAt'],
  },
}
```

**Frontend query contract**:
```
GET /api/pages?where[tenant.slug][equals]={slug}&where[_status][equals]=published
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `access.read` returns `_status: published` for public | Vitest — call access function with no user |
| Integration | Tenant-admin publishes after autosave; public endpoint excludes drafts | Vitest — seed page, publish via local API, query REST API |
| Integration | `validateLayoutStructure` hook still blocks structural changes with autosave | Vitest — modify existing test to work with drafts (update `status` → `_status`) |
| Integration | Scheduled publish job executes and publishes page | Vitest — set `_publishOn` in past, trigger job runner |
| E2E | Tenant-admin login → edit page → autosave → publish → public sees it | Playwright — admin UI flow |

## Migration / Rollout

1. Deploy new `Pages` config with `versions.drafts` + old `status` field (hidden from admin)
2. Run migration script: iterate pages, if `status === 'published'` → `payload.update({ _status: 'published', overrideAccess: true })`
3. Verify: query `_status` field; all previously-published pages show `published`
4. Remove `status` field from config, deploy
5. Deploy updated frontend starters with `_status` query

**Rollback**: Revert `Pages.ts` to manual `status`, reverse-migrate `_status` → `status`, drop `pages_versions` table, revert frontend queries.

## Railway Architecture

```
Railway Project: agencia-backend
├── Service: backend (main app)
│   Command: pnpm start
│   Env: ENABLE_JOBS=false, DATABASE_URL, PAYLOAD_SECRET
│   Port: 3000
└── Service: worker (job processor)
    Command: pnpm start
    Env: ENABLE_JOBS=true, DATABASE_URL, PAYLOAD_SECRET
    No exposed port
```

`shouldAutoRun` in `payload.config.ts`:
```ts
shouldAutoRun: async () => process.env.ENABLE_JOBS === 'true',
```

## Open Questions

- [ ] Confirm `payload.update({ _status: 'published' })` works when drafts auto-add `_status` — verify in staging before production migration
