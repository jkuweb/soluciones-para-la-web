# multi-tenant-setup Specification

## Purpose

Install and configure `@payloadcms/plugin-multi-tenant` with tenant-scoped collections that enforce data isolation between tenants.

## Requirements

### Requirement: Multi-tenant plugin installation

The project MUST install `@payloadcms/plugin-multi-tenant` as a dependency.

#### Scenario: Plugin is importable from config

- GIVEN the project dependencies are installed
- WHEN `payload.config.ts` imports `@payloadcms/plugin-multi-tenant`
- THEN the import SHALL resolve without errors
- AND the plugin SHALL be registered in the `plugins` array of the Payload config

### Requirement: Tenants collection

A `Tenants` collection MUST exist and be accessible only by super-admin users.

#### Scenario: Tenants collection exists in admin UI

- GIVEN the dev server is running and a super-admin is logged in
- WHEN navigating to the admin collections list
- THEN the `Tenants` collection SHALL be visible
- AND standard users SHALL NOT see the `Tenants` collection

### Requirement: Tenant-scoped collections

Collections `Users`, `Pages`, `Media`, `Header`, and `Footer` MUST be scoped to the current tenant when the multi-tenant plugin is active.

#### Scenario: Admin user sees only their tenant's data

- GIVEN Tenant A has user `alice@a.com` and Tenant B has user `bob@b.com`
- WHEN `alice@a.com` logs into the admin panel
- THEN the Users list SHALL show only Tenant A's users
- AND `bob@b.com` SHALL NOT appear in the list
- AND Tenant A's Header and Footer documents SHALL be visible in the admin collection list

#### Scenario: Cross-tenant access is rejected at API level

- GIVEN Tenant A attempts a REST API request to read a Tenant B document
- WHEN the request is processed
- THEN the API SHALL return a 403 Forbidden or empty result
- AND Tenant B's data SHALL NOT be exposed

#### Scenario: Header and Footer registered in plugin collections map

- GIVEN the multi-tenant plugin is configured
- WHEN the Payload server starts
- THEN `header` and `footer` SHALL be listed in `multiTenantPlugin.collections`
- AND the server SHALL start without configuration errors

### Requirement: Multi-tenant plugin configuration

The plugin SHALL be configured with tenant-scoped collections as defined in the plugin documentation.

#### Scenario: Plugin configuration is valid at startup

- GIVEN `payload.config.ts` registers the multi-tenant plugin with an explicit collections list
- WHEN the Payload server starts
- THEN the server SHALL start without configuration errors
- AND the plugin SHALL apply field-level access control to declared collections

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
