# Pages Specification

## Purpose

Multi-tenant page management with Payload native versions/drafts, autosave, and scheduled publish. Replaces the manual `status` field with Payload's auto-injected `_status`.

## Requirements

### Requirement: Draft Workflow

The Pages collection MUST enable Payload `versions.drafts` with autosave so edits persist without explicit save. Maximum 50 versions per document SHALL be retained.

#### Scenario: Autosave captures draft changes

- GIVEN a tenant-admin editing a page
- WHEN content changes and the autosave interval elapses
- THEN a draft version SHALL be saved to `pages_versions`
- AND the page's `_status` SHALL remain `draft`

### Requirement: _status Replaces Manual Status

The manual `status` select field MUST be removed. Payload's auto-injected `_status` field (`draft` | `published`) SHALL replace it. The admin UI SHALL display `_status` in the default column list.

#### Scenario: Admin UI shows _status

- GIVEN a user viewing the Pages list in admin
- WHEN the list renders
- THEN the `_status` column SHALL show `draft`, `published`, or `changed`
- AND the old `status` column SHALL NOT appear

### Requirement: Publish Access

Tenant-admin users SHALL be allowed to publish pages within their tenant. The publish action sets `_status` to `published`. Super-admins SHALL publish across all tenants. Public users SHALL NOT publish.

#### Scenario: Tenant-admin publishes a page

- GIVEN a tenant-admin with an autosaved draft page
- WHEN they click "Publish" in the admin UI
- THEN `_status` SHALL transition to `published`
- AND the published version SHALL appear in public API queries

### Requirement: Public Read Isolation

Unauthenticated requests to the Pages REST API MUST return only pages with `_status: published`. Drafts SHALL NOT be exposed publicly.

#### Scenario: Public API excludes drafts

- GIVEN pages with `_status: draft` and `_status: published` exist
- WHEN an unauthenticated GET request hits `/api/pages`
- THEN only `_status: published` pages SHALL be returned
- AND `_status: draft` pages SHALL NOT appear

### Requirement: Tenant-Scoped Access Preserved

Authenticated non-super-admin users MUST only see pages belonging to their assigned tenants. Tenant isolation SHALL work alongside `_status` filtering.

#### Scenario: Cross-tenant draft hidden

- GIVEN Tenant A has a draft page and tenant-admin B belongs to Tenant B only
- WHEN tenant-admin B queries the Pages API
- THEN Tenant A's draft SHALL NOT appear in results

### Requirement: Status Migration

Existing pages with `status: published` MUST retain their published state after migration. The migration SHALL set `_status` to `published` for those documents. Pages with `status: draft` SHALL remain as `draft`.

#### Scenario: Legacy published page stays published

- GIVEN a page with manual `status: published` before migration
- WHEN the migration script executes
- THEN `_status` SHALL be `published`
- AND the page SHALL appear in public queries

### Requirement: Scheduled Publish

Pages SHALL support scheduling a future publish date via `_publishOn`. A background job worker MUST process scheduled publishes within ±1 minute of the scheduled time.

#### Scenario: Page publishes at scheduled time

- GIVEN a draft page with `_publishOn` set to 2026-06-12T10:00:00Z
- WHEN the job worker runs at or after 10:00 UTC
- THEN `_status` SHALL transition to `published`

### Requirement: Validation Hook Compatibility

The `validateLayoutStructure` beforeChange hook MUST continue blocking structural layout changes by tenant-admins while allowing autosave of content-only edits.

#### Scenario: Hook allows autosave, blocks structural edits

- GIVEN a tenant-admin editing a page with autosave active
- WHEN only content fields change (no layout structure changes)
- THEN the beforeChange hook SHALL pass validation
- AND the draft SHALL be saved

### Requirement: Frontend Query Contract

Client frontend sites (Astro, Next.js) SHALL query pages using `where[_status][equals]=published` to fetch only published content.

#### Scenario: Frontend fetches published pages

- GIVEN a client frontend connected to the backend REST API
- WHEN querying `/api/pages?where[_status][equals]=published&where[tenant.slug][equals]=<slug>`
- THEN only published pages for that tenant SHALL be returned
