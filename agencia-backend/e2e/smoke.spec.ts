import { test, expect } from '@playwright/test'

test.describe('Payload Admin UI', () => {
  test('homepage redirects to admin', async ({ page }) => {
    await page.goto('/')
    // Should redirect to /admin
    await expect(page).toHaveURL(/\/admin/)
  })
})
