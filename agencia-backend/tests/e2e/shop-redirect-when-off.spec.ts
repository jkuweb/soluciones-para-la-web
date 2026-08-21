import { test, expect } from '@playwright/test'

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000'

test.describe('catalog feature-gating', () => {
  test('/shop shows the redirect placeholder OR the page (tolerates both states)', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/shop`)
    const onPage = await page.locator('[data-testid="shop-page"]').count()
    const redirected = await page.locator('[data-testid="shop-redirected"]').count()
    expect(onPage + redirected).toBeGreaterThan(0)
  })
})
