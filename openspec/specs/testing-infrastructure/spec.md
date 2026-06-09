# testing-infrastructure Specification

## Purpose

Configure a test-ready toolchain with Vitest for unit/integration tests, Playwright for E2E tests, TypeScript type-checking via `tsc --noEmit`, and v8 coverage reporting.

## Requirements

### Requirement: Vitest unit/integration runner

The project MUST configure Vitest as the test runner with `@vitest/coverage-v8`.

#### Scenario: Vitest runs and passes

- GIVEN the project has at least one test file matching the Vitest include pattern
- WHEN `pnpm test` is executed
- THEN Vitest SHALL run all matching test files
- AND the exit code SHALL be 0 when all tests pass

#### Scenario: Vitest fails on broken tests

- GIVEN a test file contains a failing assertion
- WHEN `pnpm test` is executed
- THEN Vitest SHALL report the failure with file, line, and expected/actual values
- AND the exit code SHALL be non-zero

### Requirement: Playwright E2E runner

The project MUST configure Playwright for end-to-end browser tests.

#### Scenario: Playwright runs and passes

- GIVEN the dev server is running on `localhost:3000`
- WHEN `pnpm test:e2e` is executed
- THEN Playwright SHALL execute the configured test suite
- AND the exit code SHALL be 0 when all E2E tests pass

#### Scenario: Playwright fails on unreachable server

- GIVEN the dev server is NOT running
- WHEN `pnpm test:e2e` is executed
- THEN Playwright SHALL report a connection error
- AND the exit code SHALL be non-zero

### Requirement: TypeScript type-checking

The project MUST provide a `typecheck` script that runs `tsc --noEmit` with zero errors.

#### Scenario: TypeScript compiles without errors

- GIVEN all source files have valid TypeScript
- WHEN `pnpm typecheck` is executed
- THEN `tsc --noEmit` SHALL complete with exit code 0

#### Scenario: TypeScript reports type errors

- GIVEN a source file contains a TypeScript type error
- WHEN `pnpm typecheck` is executed
- THEN `tsc --noEmit` SHALL report the error with file and line number
- AND the exit code SHALL be non-zero

### Requirement: V8 coverage reporting

Vitest SHALL report code coverage using the v8 provider.

#### Scenario: Coverage reports are generated

- GIVEN the Vitest include pattern is configured
- WHEN `pnpm test --coverage` is executed
- THEN coverage SHALL be reported for at least the `src/` directory
- AND a text summary SHALL appear in the terminal output
