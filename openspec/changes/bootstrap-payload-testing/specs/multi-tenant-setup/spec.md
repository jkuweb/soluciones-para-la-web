# Delta for multi-tenant-setup

## ADDED Requirements

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

Collections `Users`, `Pages`, and `Media` MUST be scoped to the current tenant.

#### Scenario: Admin user sees only their tenant's data

- GIVEN Tenant A has user `alice@a.com` and Tenant B has user `bob@b.com`
- WHEN `alice@a.com` logs into the admin panel
- THEN the Users list SHALL show only Tenant A's users
- AND `bob@b.com` SHALL NOT appear in the list

#### Scenario: Cross-tenant access is rejected at API level

- GIVEN Tenant A attempts a REST API request to read a Tenant B document
- WHEN the request is processed
- THEN the API SHALL return a 403 Forbidden or empty result
- AND Tenant B's data SHALL NOT be exposed

### Requirement: Multi-tenant plugin configuration

The plugin SHALL be configured with tenant-scoped collections as defined in the plugin documentation.

#### Scenario: Plugin configuration is valid at startup

- GIVEN `payload.config.ts` registers the multi-tenant plugin with an explicit collections list
- WHEN the Payload server starts
- THEN the server SHALL start without configuration errors
- AND the plugin SHALL apply field-level access control to declared collections
