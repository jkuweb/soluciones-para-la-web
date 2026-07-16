# Delta for multi-tenant-setup

## ADDED Requirements

### Requirement: Blog Collections in Plugin Map

The multi-tenant plugin's `collections` map MUST include `posts`, `categories`, and `tags` so that the plugin auto-injects a `tenant` relationship field on each and scopes admin list views and access control by tenant.

#### Scenario: Posts collection is tenant-scoped

- GIVEN the multi-tenant plugin is configured with `posts: {}` in the collections map
- WHEN the Payload server starts
- THEN the `Posts` collection SHALL have a `tenant` field auto-injected
- AND admin list queries SHALL be filtered to the current user's tenant

#### Scenario: Categories collection is tenant-scoped

- GIVEN the plugin is configured with `categories: {}`
- WHEN a tenant-admin views the Categories list
- THEN only categories belonging to their assigned tenants SHALL appear

#### Scenario: Tags collection is tenant-scoped

- GIVEN the plugin is configured with `tags: {}`
- WHEN a tenant-admin views the Tags list
- THEN only tags belonging to their assigned tenants SHALL appear

#### Scenario: Plugin starts without error with extended collections map

- GIVEN the multi-tenant plugin is configured with `collections: { pages: {}, media: {}, header: {}, footer: {}, posts: {}, categories: {}, tags: {} }`
- WHEN the Payload server starts
- THEN the server SHALL start without configuration errors
- AND all seven collections SHALL have tenant-scoped access control active

### Requirement: Per-Tenant Slug Uniqueness Convention

Any new multi-tenant collection that carries a `slug` field MUST enforce slug uniqueness scoped to the tenant, not globally. This requirement formalizes the pattern already established by the `Pages` collection's `validateUniqueSlug` hook.

#### Scenario: Collections with slug fields are scoped

- GIVEN a collection is listed in the multi-tenant plugin's `collections` map
- AND the collection has a `slug` field
- WHEN a document save is attempted
- THEN slug uniqueness SHALL be checked only within the same tenant
- AND the same slug MAY exist in a different tenant
