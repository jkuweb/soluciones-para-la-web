# Utilities Specification

## Purpose

Reusable utility functions for URL resolution and object merging used across the Payload backend configuration.

## Requirements

### Requirement: Server URL Resolution (getURL)

The system MUST provide a `getURL` function that returns the server URL from `NEXT_PUBLIC_SERVER_URL` with a `http://localhost:3000` fallback. Trailing slashes SHALL be stripped from the returned URL.

#### Scenario: Production env var set

- GIVEN `NEXT_PUBLIC_SERVER_URL='https://backend.example.com'`
- WHEN `getURL()` is called
- THEN it returns `'https://backend.example.com'`

#### Scenario: Trailing slash stripped

- GIVEN `NEXT_PUBLIC_SERVER_URL='https://backend.example.com/'`
- WHEN `getURL()` is called
- THEN it returns `'https://backend.example.com'`

#### Scenario: Fallback to localhost

- GIVEN no `NEXT_PUBLIC_SERVER_URL`
- WHEN `getURL()` is called
- THEN it returns `'http://localhost:3000'`

### Requirement: Deep Merge with Array Concatenation (deepMerge)

The system MUST provide a `deepMerge` function that recursively merges source objects into a target, preserving target values not present in the source. Arrays of objects SHALL be merged by shallow index (not replaced), and non-object arrays SHALL be replaced. Null and undefined source values SHALL be handled without throwing.

#### Scenario: Objects merged recursively

- GIVEN `target = { a: { x: 1, y: 2 }, b: 3 }` and `source = { a: { y: 99 }, c: 4 }`
- WHEN `deepMerge(target, source)` is called
- THEN the result is `{ a: { x: 1, y: 99 }, b: 3, c: 4 }`

#### Scenario: Array of objects merged by index

- GIVEN `target = { items: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }] }` and `source = { items: [{ name: 'updated' }] }`
- WHEN `deepMerge(target, source)` is called
- THEN the result is `{ items: [{ id: 1, name: 'updated' }, { id: 2, name: 'b' }] }`

#### Scenario: Non-object array replaced

- GIVEN `target = { tags: ['a', 'b'] }` and `source = { tags: ['c'] }`
- WHEN `deepMerge(target, source)` is called
- THEN the result is `{ tags: ['c'] }`

#### Scenario: Null and undefined values handled

- GIVEN `target = { a: 1, b: 2 }` and `source = { a: null, b: undefined }`
- WHEN `deepMerge(target, source)` is called
- THEN the result is `{ a: null, b: 2 }` (null overwrites, undefined does not)
