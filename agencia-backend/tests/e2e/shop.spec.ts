import { test, expect } from '@playwright/test'

const TENANT_SLUG = process.env.E2E_TENANT_SLUG || 'mood'
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000'

test.describe('catalog /shop', () => {
  test('renders the shop page with products', async ({ page }) => {
    await page.goto(`${BASE_URL}/shop`)
    const isRedirected = await page.locator('[data-testid="shop-redirected"]').count()
    if (isRedirected > 0) {
      test.skip(
        true,
        'catalog feature is off for this tenant — run `pnpm add-feature catalog --slug=' +
          TENANT_SLUG +
          '` first',
      )
    }
    await expect(page.locator('[data-testid="shop-page"]')).toBeVisible()
  })
})
