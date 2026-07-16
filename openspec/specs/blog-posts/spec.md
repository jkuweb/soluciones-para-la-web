# blog-posts Specification

## Purpose

Multi-tenant blog post management with drafts, autosave, taxonomy relationships, and per-post SEO. Mirrors Pages collection patterns for draft workflow, preview endpoint, and per-tenant slug uniqueness.

## Requirements

### Requirement: Posts Collection Schema

The system MUST expose a `Posts` collection:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | text | yes | |
| `slug` | slugField, indexed | yes | Unique per tenant |
| `heroImage` | upload → media | yes | |
| `content` | richText (Lexical) | yes | Text only: root + h2-h4 headings + links + HR. No BlocksFeature. |
| `categories` | relationship → categories, hasMany | no | |
| `tags` | relationship → tags, hasMany | no | |
| `publishedAt` | date | no | Auto-filled on first publish |
| `excerpt` | text (max 300) | no | |
| `metaTitle` | text (max 60) | no | |
| `metaDescription` | textarea (max 160) | no | |
| `metaImage` | upload → media | no | |

The `tenant` field SHALL be auto-injected by `@payloadcms/plugin-multi-tenant`. No `authors` field — author identity SHALL be resolved from `createdBy`.

#### Scenario: Post created with required fields

- GIVEN a tenant-admin logged into their tenant
- WHEN they fill `title`, `heroImage`, and `content` and save
- THEN `_status` SHALL be `draft` and `slug` SHALL be auto-generated from `title`

#### Scenario: Post without heroImage is rejected

- GIVEN a tenant-admin creating a post
- WHEN they omit `heroImage`
- THEN the save SHALL be rejected with a required-field validation error

### Requirement: Draft Workflow

The Posts collection MUST enable `versions.drafts` with `autosave.interval: 500`, `schedulePublish: true`, and `maxPerDoc: 50`. This mirrors the Pages draft workflow.

#### Scenario: Autosave persists unsaved edits

- GIVEN a tenant-admin editing a post
- WHEN 500ms elapses after a content change without manual save
- THEN a draft version SHALL be persisted and `_status` SHALL remain `draft`

#### Scenario: Scheduled publish activates

- GIVEN a draft post with `_publishOn` in the future
- WHEN the job worker runs at or after that time
- THEN `_status` SHALL become `published` and `publishedAt` SHALL auto-fill

### Requirement: Access Control

Read access SHALL follow `authenticatedOrPublished`: authed users see all tenant-scoped posts; anonymous sees only `_status: published`.

Write access SHALL use `tenantAccess`: super-admin full access; tenant-admin and tenant-editor within assigned tenants only. `create` SHALL be restricted to `super-admin`.

#### Scenario: Anonymous reads published post

- GIVEN a published post in Tenant A
- WHEN `GET /api/posts?where[tenant.slug][equals]=tenant-a` unauthenticated
- THEN the post SHALL be returned

#### Scenario: Anonymous cannot see draft

- GIVEN a draft post
- WHEN an unauthenticated request queries `/api/posts`
- THEN the draft SHALL NOT appear

#### Scenario: Cross-tenant read blocked

- GIVEN a tenant-admin assigned to Tenant A only
- WHEN they query `/api/posts`
- THEN posts belonging to Tenant B SHALL NOT be returned

### Requirement: Per-Tenant Slug Uniqueness

Slug uniqueness MUST be enforced per tenant. Two tenants MAY share the same slug. Within one tenant, duplicates SHALL be rejected. The hook SHALL query for existing posts where `slug` and `tenant` match the current document.

#### Scenario: Same slug in two tenants succeeds

- GIVEN Tenant A has slug `hello-world`
- WHEN Tenant B creates a post with slug `hello-world`
- THEN both SHALL succeed

#### Scenario: Duplicate slug within tenant rejected

- GIVEN Tenant A has slug `hello-world`
- WHEN Tenant A creates another post with the same slug
- THEN the save SHALL be rejected

### Requirement: Preview Endpoint

A `GET /api/posts/preview-post` endpoint SHALL accept `secret`, `tenantSlug`, and `slug`. It SHALL return 403 for wrong secret, 400 for missing params, 404 for not found, and the full draft document on success. Pattern mirrors the Pages `preview-page` endpoint.

#### Scenario: Valid preview returns draft

- GIVEN a draft post with slug `my-post` in tenant `acme`
- WHEN `GET /api/posts/preview-post?secret=correct&tenantSlug=acme&slug=my-post`
- THEN 200 with draft data SHALL be returned

#### Scenario: Wrong secret returns 403

- GIVEN any post exists
- WHEN `GET /api/posts/preview-post?secret=wrong`
- THEN 403 `{ error: "Invalid preview secret" }` SHALL be returned

### Requirement: Default Populate

`defaultPopulate` SHALL return `title`, `slug`, `categories`, `meta.image` for lightweight list views.

#### Scenario: Admin list loads minimal columns

- GIVEN a user viewing the Posts list
- WHEN the list renders
- THEN columns SHALL include `title`, `slug`, `_status`, `publishedAt`
- AND `content` and `heroImage` binary data SHALL NOT be in the payload
