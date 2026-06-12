# Access Factories Specification

## Purpose

Reusable Payload CMS access control factories that eliminate duplicated inline access logic across collections and globals. Follows the Payload Website Template pattern.

## Requirements

### Requirement: Public Access (anyone)

The system MUST provide an `anyone` access factory that grants unrestricted access. It SHALL return `true` unconditionally for all operations and collections.

#### Scenario: Unauthenticated read on public collection

- GIVEN a collection using the `anyone` access factory
- WHEN an unauthenticated request reads documents
- THEN access is granted

### Requirement: Authenticated Access (authenticated)

The system MUST provide an `authenticated` access factory that allows access when a user is present in the request. It SHALL check `req.user` and return `Boolean(user)`.

#### Scenario: Logged-in user accesses protected collection

- GIVEN a collection using `authenticated` for create/update/delete
- WHEN a request with a valid authenticated user performs the operation
- THEN access is granted

#### Scenario: Unauthenticated request denied

- GIVEN a collection using `authenticated`
- WHEN an unauthenticated request performs the operation
- THEN access is denied

### Requirement: Authenticated or Published (authenticatedOrPublished)

The system MUST provide an `authenticatedOrPublished` access factory for read operations. Authenticated users SHALL see all documents. Unauthenticated users SHALL only see documents with `_status` equals `'published'`.

#### Scenario: Authenticated user sees all documents

- GIVEN a collection with draft and published documents, using `authenticatedOrPublished` for read
- WHEN a logged-in user queries the collection
- THEN all documents are returned regardless of `_status`

#### Scenario: Public user sees only published

- GIVEN a collection with draft and published documents, using `authenticatedOrPublished` for read
- WHEN an unauthenticated request queries the collection
- THEN only documents with `_status: 'published'` are returned

### Requirement: Tenant-constrained Access (tenantAccess factory)

The system MUST provide a `tenantAccess` factory that accepts a `fieldName` parameter (default `'tenant'`) and returns an Access function enforcing tenant isolation.

The returned function SHALL extract tenant IDs from `user.tenants[].tenant`, handling polymorphic values: string, number, or object with `.id`. Super-admin users SHALL bypass the filter. Unauthenticated requests SHALL be denied.

#### Scenario: Super-admin bypasses tenant filter

- GIVEN a user with role `super-admin`
- WHEN `tenantAccess('tenant')` evaluates access
- THEN `true` is returned

#### Scenario: Tenant user constrained to their tenants

- GIVEN a tenant-admin with `tenants: [{ tenant: 'abc' }, { tenant: 'def' }]`
- WHEN `tenantAccess('tenant')` evaluates read access
- THEN the query is constrained to `{ tenant: { in: ['abc', 'def'] } }`

#### Scenario: Object tenant id extraction

- GIVEN a user with `tenants: [{ tenant: { id: 'site-1' } }]`
- WHEN `tenantAccess` resolves tenant IDs
- THEN `'site-1'` is extracted and used in the `in` filter

#### Scenario: Numeric tenant id stringified

- GIVEN a user with `tenants: [{ tenant: 42 }]`
- WHEN `tenantAccess` resolves tenant IDs
- THEN `'42'` is extracted as a string

#### Scenario: String tenant id passed through

- GIVEN a user with `tenants: [{ tenant: 'direct-id' }]`
- WHEN `tenantAccess` resolves tenant IDs
- THEN `'direct-id'` is used unchanged

#### Scenario: Unauthenticated user denied

- GIVEN an unauthenticated request (no `req.user`)
- WHEN `tenantAccess` evaluates access
- THEN access is denied

#### Scenario: Custom field name

- GIVEN a collection using a different tenant field name `author_id`
- WHEN `tenantAccess('author_id')` is used
- THEN the constraint targets `{ author_id: { in: [...] } }`
