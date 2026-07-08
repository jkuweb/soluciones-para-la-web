# Archive Report — header-footer-to-collections

**Archived**: 2026-06-20
**Change**: header-footer-to-collections
**Project**: soluciones-para-la-web (agencia)
**Mode**: openspec

## Executive Summary

Migrated `Header` and `Footer` from Payload globals (`GlobalConfig`) to multi-tenant-scoped collections (`CollectionConfig`). All implementation phases (1–5) complete and verified. The change enables per-tenant header/footer isolation, which was previously impossible because globals bypass the multi-tenant plugin.

## Verification Status

- **Verdict**: PASS WITH WARNINGS
- **Verification report**: Engram observation #333 (`sdd/header-footer-to-collections/verify-report`)
- **CRITICAL issues**: None
- **Warnings**: 2 pre-existing test failures in `api.int.spec.ts` and `validateLayoutStructure.int.spec.ts` (unrelated to this change)
- **Suggestion**: `ensureUniqueTenant` hook only checks on `create` — consider adding `update` guard if tenant reference could change

## Task Completion Gate

Tasks 6.1 and 6.2 (Phase 6: Sync Propagation) remain intentionally unchecked. These are **manual operational steps** for client propagation via `pnpm sync:clients --apply`, not implementation tasks. Per the tasks.md note: _"Phase 6 (client sync) is a manual operational step — run pnpm sync:clients --filter=outdated --dry-run first to review, then --apply to propagate starter changes."_

Apply-progress confirms Phases 1–5 are fully complete. The verify report confirms all implementation tasks pass. Proceeding with archive; Phase 6 remains as a follow-up action for the user.

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| multi-tenant-setup | Modified | Updated "Tenant-scoped collections" requirement: added `Header` and `Footer` to the collection list. Added new scenario "Header and Footer registered in plugin collections map". Extended "Admin user sees only their tenant's data" scenario with Header/Footer visibility clause. |

## Archive Contents

```
openspec/changes/archive/2026-06-20-header-footer-to-collections/
├── archive-report.md    (this file)
├── apply-progress.md    (Phases 1–5 complete)
├── design.md            (Architecture decisions, data flow, migration plan)
├── proposal.md          (Intent, scope, approach, risks, rollback)
├── specs/
│   └── multi-tenant-setup/
│       └── spec.md      (Delta spec — merged into main)
└── tasks.md             (Phases 1–5 checked; Phase 6 manual)
```

### Artifact Traceability

| Artifact | Location | ID/Path |
|----------|----------|---------|
| Proposal | Filesystem | `openspec/changes/archive/2026-06-20-header-footer-to-collections/proposal.md` |
| Spec (delta) | Filesystem | `openspec/changes/archive/2026-06-20-header-footer-to-collections/specs/multi-tenant-setup/spec.md` |
| Design | Filesystem | `openspec/changes/archive/2026-06-20-header-footer-to-collections/design.md` |
| Tasks | Filesystem | `openspec/changes/archive/2026-06-20-header-footer-to-collections/tasks.md` |
| Apply Progress | Filesystem | `openspec/changes/archive/2026-06-20-header-footer-to-collections/apply-progress.md` |
| Verify Report | **Engram** | Observation #333, topic `sdd/header-footer-to-collections/verify-report` |
| Main Spec (updated) | Filesystem | `openspec/specs/multi-tenant-setup/spec.md` |

> **Note**: The verify report exists only in Engram (observation #333), not as a `verify-report.md` file. The filesystem archive does not contain a `verify-report.md`; the Engram observation serves as the canonical verification record.

## Source of Truth Updated

- `openspec/specs/multi-tenant-setup/spec.md` — "Tenant-scoped collections" requirement now includes `Header` and `Footer`

## Follow-up Actions

1. **Client sync** (Phase 6 tasks 6.1/6.2): Run `pnpm sync:clients --filter=outdated --dry-run` to review, then `pnpm sync:clients --filter=outdated --apply` to propagate `payload.ts` and `types.ts` changes to all dev clients.
2. **Pre-existing test failures**: `api.int.spec.ts` (published pages visibility) and `validateLayoutStructure.int.spec.ts` (reorder blocks) should be addressed in a separate change.
3. **ensureUniqueTenant hook**: Consider extending the `beforeChange` hook to also guard on `update` if the tenant reference could change.

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived. Ready for the next change.
