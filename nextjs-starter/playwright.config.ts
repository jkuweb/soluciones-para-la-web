import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for the nextjs-starter client.
 *
 * The happy-path E2E requires a fully configured environment:
 *   - Running dev server (started by `webServer` below or already on :3000)
 *   - `mood` tenant with `stripeAccountStatus='active'` and a real
 *     `stripeAccountId` (otherwise /api/checkout/session will 4xx)
 *   - At least one published product in `mood` (the test discovers it)
 *   - `STRIPE_SECRET_KEY` set in the env (for the static skip check)
 *   - Stripe CLI forwarding webhooks to the dev server (Task 24 setup)
 *
 * CI runs against a build: webServer is disabled and a pre-started server
 * on :3000 is expected. Locally, Playwright starts `pnpm dev` itself.
 */
export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 60_000,
      },
})
