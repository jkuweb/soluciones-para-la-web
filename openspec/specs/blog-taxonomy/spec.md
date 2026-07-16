# blog-taxonomy Specification

## Purpose

Multi-tenant Categories and Tags collections for blog post classification. Both are flat (no hierarchy), tenant-scoped via the multi-tenant plugin, with per-tenant slug uniqueness.

## Requirements

### Requirement: Categories Collection

The system MUST expose a `Categories` collection with fields: `title` (text, required), `slug` (text, auto-generated from title via Payload's `slugField`, unique per tenant). The `tenant` field SHALL be auto-injected by `@payloadcms/plugin-multi-tenant`.

The collection SHALL use `title` as its admin display field (`admin.useAsTitle: 'title'`).

#### Scenario: Category created with auto-slug

- GIVEN a tenant-admin in Tenant A
- WHEN they create a category with title "Salud y Bienestar"
- THEN `slug` SHALL be auto-generated as `salud-y-bienestar`
- AND the category SHALL reference Tenant A

#### Scenario: Duplicate slug in same tenant rejected

- GIVEN Tenant A has a category with slug `nutricion`
- WHEN Tenant A creates another category whose title resolves to slug `nutricion`
- THEN the operation SHALL be rejected with a uniqueness error

#### Scenario: Same slug in different tenants allowed

- GIVEN Tenant A has a category with slug `nutricion`
- WHEN Tenant B creates a category with title "Nutrición"
- THEN both categories SHALL be created
- AND each SHALL be isolated to its own tenant

### Requirement: Tags Collection

The system MUST expose a `Tags` collection with fields: `title` (text, required), `slug` (text, auto-generated from title via Payload's `slugField`, unique per tenant). The `tenant` field SHALL be auto-injected.

The collection SHALL use `title` as its admin display field.

#### Scenario: Tag created with auto-slug

- GIVEN a tenant-admin in Tenant A
- WHEN they create a tag with title "Vegano"
- THEN `slug` SHALL be auto-generated as `vegano`

#### Scenario: Tags are tenant-isolated

- GIVEN Tenant A's admin queries `/api/tags`
- WHEN the request is processed
- THEN only Tenant A's tags SHALL be returned

### Requirement: Access Control

Read access for Categories and Tags SHALL require authentication. Categories and Tags SHALL NOT be exposed to unauthenticated public API queries in v1 (the frontend fetches them server-side from within the starter project).

Write access SHALL follow the same pattern as Posts: `super-admin` full access across all tenants; `tenant-admin` and `tenant-editor` access within their assigned tenants only.

#### Scenario: Tenant-editor can create a category

- GIVEN a tenant-editor assigned to Tenant A
- WHEN they create a new category
- THEN the create SHALL succeed
- AND the category SHALL reference Tenant A

#### Scenario: Anonymous cannot list categories

- GIVEN an unauthenticated request
- WHEN `GET /api/categories` is called
- THEN the response SHALL deny access

### Requirement: Delete Behavior with Referenced Posts

When a Category or Tag is deleted, posts that reference it MUST NOT be deleted. The relationship SHALL be nullified (the post loses that category/tag reference). This behavior follows from making the relationship field non-required (`hasMany: true` without `required: true`).

Rationale: Taxonomy is optional in v1. Losing a category reference is less destructive than deleting posts or blocking the admin delete action. A future version MAY add a confirmation dialog or orphan detection in the admin UI.

#### Scenario: Deleting a category preserves posts

- GIVEN a category "Salud" with 3 posts referencing it
- WHEN a tenant-admin deletes the category
- THEN the category document SHALL be removed
- AND the 3 posts SHALL still exist
- AND the posts' `categories` array SHALL no longer contain the deleted category

#### Scenario: Deleting a tag preserves posts

- GIVEN a tag "Vegano" with 2 posts referencing it
- WHEN the tag is deleted
- THEN the posts SHALL remain
- AND the posts' `tags` array SHALL no longer contain the deleted tag

### Requirement: Per-Tenant Slug Uniqueness

Both Categories and Tags MUST enforce slug uniqueness scoped per tenant, using the same hook pattern as Posts (and Pages). Within a single tenant, duplicate slugs SHALL be rejected. Across tenants, identical slugs SHALL be allowed.
