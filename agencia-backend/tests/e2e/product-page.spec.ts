import { test, expect } from '@playwright/test'

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000'

test.describe('catalog /product/[slug]', () => {
  test('renders a product page for a known slug', async ({ page }) => {
    await page.goto(`${BASE_URL}/shop`)
    const isRedirected = await page.locator('[data-testid="shop-redirected"]').count()
    if (isRedirected > 0) {
      test.skip(true, 'catalog feature is off for this tenant')
    }
    const firstLink = page.locator('a[href^="/product/"]').first()
    const href = await firstLink.getAttribute('href')
    if (!href) {
      test.skip(true, 'no products in the shop to navigate to')
    }
    await page.goto(`${BASE_URL}${href}`)
    await expect(page.locator('[data-testid="product-page"]')).toBeVisible()
  })

  test('returns 404 for a nonexistent slug', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/product/__nonexistent-slug-zzz`)
    expect(response?.status()).toBe(404)
  })
})
