# Tasks: Payload Config Cleanup

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~60–80 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | N/A |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: N/A
400-line budget risk: Low

## Phase 1: Plugin Extraction

- [x] 1.1 Create `src/plugins/index.ts` with barrel export: define `plugins` array of type `Config['plugins']`, move `multiTenantPlugin<Config>({...})` config from `payload.config.ts`, import `User` from `@/payload-types` for the `userHasAccessToAllTenants` callback parameter type
- [x] 1.2 In `src/payload.config.ts`: import `plugins` from `./plugins`, replace the inline `plugins: [multiTenantPlugin(...)]` with `plugins: [...plugins]`, remove the `@payloadcms/plugin-multi-tenant` import

## Phase 2: CORS/CSRF Hardening

- [x] 2.1 In `src/payload.config.ts`: import `getServerUrl` from `./utilities/getURL`, add `cors: [getServerUrl()]` and `csrf: [getServerUrl()]` inside `buildConfig({...})`
- [x] 2.2 Verify the `getServerUrl()` import path resolves correctly (file exists at `src/utilities/getURL.ts`)

## Phase 3: Verification

- [x] 3.1 Run `pnpm typecheck` — confirm zero errors
- [x] 3.2 Run `pnpm lint` — confirm zero errors
- [x] 3.3 Start dev server (`pnpm dev`), open admin panel, verify login succeeds and API calls work (same-origin)
