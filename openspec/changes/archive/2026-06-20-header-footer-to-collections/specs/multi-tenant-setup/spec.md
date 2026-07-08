# Delta for multi-tenant-setup

## MODIFIED Requirements

### Requirement: Tenant-scoped collections

Collections `Users`, `Pages`, `Media`, `Header`, and `Footer` MUST be scoped to the current tenant when the multi-tenant plugin is active.
(Previously: Collections `Users`, `Pages`, and `Media` MUST be scoped to the current tenant.)

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
