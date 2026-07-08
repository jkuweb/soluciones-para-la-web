# site-chrome Specification

## Purpose

Tenant-scoped `Header` and `Footer` collections carrying nav items, copyright, and social links. Each tenant owns exactly one header and one footer.

## Requirements

### Requirement: Header collection

The system MUST expose a `Header` collection with fields: `navItems` (array of `link` blocks, min 0, max 10), `logo` (upload to `media`), `ctaText` (text), `ctaLink` (link). The collection SHALL be tenant-scoped via `@payloadcms/plugin-multi-tenant`.

#### Scenario: Tenant reads its header via API

- GIVEN Tenant `acme` with a populated header
- WHEN `GET /api/header?where[tenant.slug][equals]=acme&limit=1&depth=1`
- THEN the response SHALL contain only the `acme` tenant's header
- AND the `tenant` field SHALL reference the `acme` tenant

#### Scenario: Unauthenticated public read

- GIVEN no authentication cookie
- WHEN `GET /api/header?where[tenant.slug][equals]=acme`
- THEN the API SHALL return 200 with the header data

#### Scenario: Unique tenant enforcement

- GIVEN Tenant `acme` already has a header document
- WHEN attempting to create a second header for `acme`
- THEN the `beforeChange` hook SHALL reject with a 400 error

### Requirement: Footer collection

The system MUST expose a `Footer` collection with fields: `copyright` (text), `socialLinks` (array of `link` blocks, min 0, max 8), `navColumns` (array of groups with `title` text and `links` array of `link` blocks). Scoped per tenant.

#### Scenario: Tenant reads its footer via API

- GIVEN Tenant `acme` with a populated footer
- WHEN `GET /api/footer?where[tenant.slug][equals]=acme&limit=1&depth=1`
- THEN the response SHALL contain only the `acme` tenant's footer

#### Scenario: Footer read isolation across tenants

- GIVEN Tenant `acme` and Tenant `beta` each have a distinct footer
- WHEN `GET /api/footer?where[tenant.slug][equals]=acme`
- THEN Tenant `beta`'s footer SHALL NOT appear in the response

### Requirement: Starter project API integration

Both `astro-starter` and `nextjs-starter` MUST query `Header` and `Footer` as collections via `?where[tenant.slug][equals]=${TENANT_SLUG}&limit=1&depth=1`. Return types SHALL include `id`, `tenant`, and timestamps alongside existing fields.

#### Scenario: Starter fetch returns typed collection result

- GIVEN the starter's `payload.ts` is configured with a tenant slug
- WHEN `getHeader()` is called
- THEN the request SHALL target `/api/header?...` (NOT `/api/globals/header`)
- AND the return type SHALL include `id: string` and `tenant: string | { slug: string }`
