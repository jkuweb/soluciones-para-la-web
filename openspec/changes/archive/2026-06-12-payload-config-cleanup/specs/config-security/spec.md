# config-security Specification

## Purpose

Hardened Payload CMS HTTP security: CORS and CSRF origin validation using the configured server URL.

## Requirements

### Requirement: CORS origin restriction

The Payload server MUST accept cross-origin requests only from the configured `NEXT_PUBLIC_SERVER_URL`.

#### Scenario: Same-origin API requests succeed

- GIVEN `NEXT_PUBLIC_SERVER_URL` is `https://admin.mysite.com`
- WHEN a client at `https://admin.mysite.com` sends a REST API request
- THEN the server SHALL respond with `Access-Control-Allow-Origin: https://admin.mysite.com`

#### Scenario: Cross-origin API requests are rejected

- GIVEN `NEXT_PUBLIC_SERVER_URL` is `https://admin.mysite.com`
- WHEN a client at `https://evil.com` sends a REST API request
- THEN the server SHALL respond without `Access-Control-Allow-Origin`
- AND the browser SHALL block the response

#### Scenario: Dev fallback on missing env variable

- GIVEN `NEXT_PUBLIC_SERVER_URL` is not set
- WHEN `getServerUrl()` is called at config build time
- THEN `cors` SHALL resolve to `http://localhost:3000`

### Requirement: CSRF origin validation

The Payload server MUST validate CSRF tokens against the configured server URL.

#### Scenario: CSRF token accepted from same origin

- GIVEN `NEXT_PUBLIC_SERVER_URL` is `https://admin.mysite.com`
- WHEN the admin UI sends a mutation request from `https://admin.mysite.com`
- THEN the CSRF token SHALL validate successfully

#### Scenario: CSRF token rejected from different origin

- GIVEN `NEXT_PUBLIC_SERVER_URL` is `https://admin.mysite.com`
- WHEN a mutation request originates from a different origin
- THEN the server SHALL reject the request with a CSRF validation error
