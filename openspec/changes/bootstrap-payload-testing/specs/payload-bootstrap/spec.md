# Delta for payload-bootstrap

## ADDED Requirements

### Requirement: Project scaffold

The system MUST generate a project via `create-payload-app@latest` with the blank template.

#### Scenario: Successful scaffold with blank template

- GIVEN Node.js >=24.15.0, pnpm, and PostgreSQL are available
- WHEN `create-payload-app` runs with `--template blank`
- THEN a working Payload CMS 3 project directory is created
- AND `package.json` contains `@payloadcms/next` and `@payloadcms/db-postgres`

#### Scenario: Scaffold fails gracefully on missing prerequisites

- GIVEN Node.js is not installed or below required version
- WHEN `create-payload-app` is invoked
- THEN the command SHALL fail with a clear error message indicating the missing prerequisite

### Requirement: PostgreSQL adapter

The scaffolded project MUST use `@payloadcms/db-postgres` as the database adapter.

#### Scenario: PostgreSQL adapter is the active adapter

- GIVEN the scaffolded project exists
- WHEN examining `payload.config.ts`
- THEN the `db` property SHALL reference `postgresAdapter` from `@payloadcms/db-postgres`

### Requirement: pnpm package manager

The project MUST use pnpm as the package manager with `onlyBuiltDependencies` configured for `sharp`.

#### Scenario: pnpm lockfile and packageManager field are present

- GIVEN the scaffolded project exists
- WHEN examining `package.json`
- THEN the `packageManager` field SHALL specify pnpm
- AND a `pnpm-lock.yaml` file SHALL exist

### Requirement: Dev server startup

The scaffolded project SHALL start without errors using `pnpm dev`.

#### Scenario: Admin UI loads on first dev start

- GIVEN `PAYLOAD_SECRET` and `POSTGRES_URL` are set in `.env`
- AND a PostgreSQL database exists and is reachable
- WHEN `pnpm dev` is executed
- THEN the Payload admin UI SHALL be accessible on `localhost:3000`
- AND no runtime errors SHALL appear in the console

### Requirement: Environment documentation

The project SHALL include `.env.example` documenting all required environment variables.

#### Scenario: .env.example contains required variables

- GIVEN the scaffolded project exists
- WHEN examining `.env.example`
- THEN `PAYLOAD_SECRET` placeholder SHALL be present
- AND `DATABASE_URI` placeholder SHALL document the PostgreSQL connection string
