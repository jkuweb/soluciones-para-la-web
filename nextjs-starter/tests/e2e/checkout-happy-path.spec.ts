import { test, expect, request } from '@playwright/test'

/**
 * Checkout happy-path E2E for the nextjs-starter client.
 *
 * What this exercises (the bits the unit tests can't):
 *   - Zustand cart store hydrates from localStorage and renders the cart page
 *   - /cart → /checkout navigation via the "Ir a checkout" link
 *   - /api/checkout/session happy path: recalculateCart + Stripe session create
 *   - Real Stripe-hosted Checkout redirect + test card payment
 *   - Stripe webhook (via stripe listen) flips the order to `paid`
 *   - /checkout/success?order_id=… renders "¡Gracias por tu compra!" + #orderId
 *
 * Why we seed the cart via addInitScript instead of clicking "Agregar al
 * carrito": the product page's AddToCartButton is intentionally hardcoded
 * `disabled` (line 93-95 of src/app/product/[slug]/page.tsx) — the click
 * path is already covered by the cart store's unit tests. The E2E value is
 * the end-to-end integration, not the button wiring.
 *
 * Static skip conditions (evaluated at module load):
 *   - STRIPE_SECRET_KEY missing → test would 4xx at /api/checkout/session
 *   - PLAYWRIGHT_SKIP_E2E=1     → operator opt-out (e.g. forks without mood)
 *
 * Runtime skip condition (in beforeAll):
 *   - mood tenant unreachable or has no published product → not testable
 */

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY
const SKIP_E2E = process.env.PLAYWRIGHT_SKIP_E2E === '1'

const STATIC_SKIP_REASON = !STRIPE_KEY
  ? 'STRIPE_SECRET_KEY must be set to run the checkout happy-path E2E.'
  : SKIP_E2E
    ? 'PLAYWRIGHT_SKIP_E2E=1 — E2E disabled by operator.'
    : null

const TENANT_SLUG = 'mood'
const PLAYWRIGHT_BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
// Derive the Payload API URL from the same base as the frontend so operators
// who override PLAYWRIGHT_BASE_URL (e.g. to test against :3001) don't end up
// with the test fetching products from a different backend.
const PAYLOAD_API_URL =
  process.env.PAYLOAD_API_URL ?? `${PLAYWRIGHT_BASE_URL}/api`
const STRIPE_CHECKOUT_HOST = /checkout\.stripe\.com/

interface ProductListResponse {
  docs: Array<{
    id: string | number
    title: string
    price: number
    currency: string
  }>
}

interface DiscoveredProduct {
  id: string
  name: string
  price: number
  currency: string
}

async function discoverMoodProduct(): Promise<DiscoveredProduct | null> {
  const ctx = await request.newContext()
  try {
    const url =
      `${PAYLOAD_API_URL}/products` +
      `?where[tenant.slug][equals]=${TENANT_SLUG}` +
      `&where[status][equals]=published` +
      `&limit=1&depth=0`
    const res = await ctx.get(url)
    if (!res.ok()) return null
    const body = (await res.json()) as ProductListResponse
    const doc = body.docs?.[0]
    if (!doc) return null
    return {
      id: String(doc.id),
      name: doc.title,
      price: doc.price,
      currency: doc.currency,
    }
  } catch {
    return null
  } finally {
    await ctx.dispose()
  }
}

test.describe('Checkout happy path', () => {
  test.skip(STATIC_SKIP_REASON !== null, STATIC_SKIP_REASON ?? '')

  let product: DiscoveredProduct | null = null
  let runtimeSkipReason: string | null = null

  test.beforeAll(async () => {
    product = await discoverMoodProduct()
    if (!product) {
      runtimeSkipReason =
        `Could not reach a published product for tenant "${TENANT_SLUG}" via ` +
        `${PAYLOAD_API_URL}. Seed the mood tenant (Task 24) before running.`
    }
  })

  test('user completes checkout with Stripe test card', async ({ page }) => {
    test.skip(product === null, runtimeSkipReason ?? 'mood product not found')

    // 1. Seed cart via localStorage BEFORE the page loads so the Zustand
    //    persist middleware hydrates with our items. The store key is
    //    `agencia-cart` and the `partialize` config means the persisted
    //    shape is just { items, tenantSlug } inside { state, version }.
    await page.addInitScript(
      (seed) => {
        localStorage.setItem('agencia-cart', JSON.stringify(seed))
      },
      {
        state: {
          items: [
            {
              productId: product!.id,
              name: product!.name,
              unitPrice: product!.price,
              quantity: 1,
              currency: product!.currency,
            },
          ],
          tenantSlug: TENANT_SLUG,
        },
        version: 0,
      },
    )

    // 2. Cart page. The product name only renders after hydration, so
    //    asserting on it doubles as a hydration barrier.
    await page.goto('/cart')
    await expect(page.getByText(product!.name)).toBeVisible()
    await expect(page.getByRole('link', { name: /ir a checkout/i })).toBeVisible()

    // 3. Checkout page
    await page.getByRole('link', { name: /ir a checkout/i }).click()
    await expect(page).toHaveURL(/\/checkout$/)
    await expect(page.getByRole('heading', { name: /^checkout$/i })).toBeVisible()

    // 4. Email
    await page.getByLabel(/email/i).fill('test@example.com')

    // 5. Click pay → redirect to Stripe-hosted Checkout
    await page.getByRole('button', { name: /pagar con stripe/i }).click()
    await page.waitForURL(STRIPE_CHECKOUT_HOST, { timeout: 30_000 })

    // 6. Stripe test card (4242 4242 4242 4242). The Card Element is a
    //    Stripe-hosted iframe; the Pay button stays in the main frame.
    //    NOTE: selectors are best-effort against Stripe's current layout
    //    and may need adjustment if Stripe changes field names/locales.
    const cardFrame = page
      .frameLocator('iframe[name^="__privateStripeFrame"]')
      .first()
    await cardFrame
      .getByLabel(/card number/i)
      .fill('4242 4242 4242 4242')
    await cardFrame.getByLabel(/card expiration/i).fill('12 / 34')
    await cardFrame.getByLabel(/card cvc/i).fill('123')
    await cardFrame.getByLabel(/zip|postal/i).fill('12345')
    await page.getByRole('button', { name: /^pay$/i }).click()

    // 7. Back on our success page. The Stripe webhook needs a moment to
    //    flip the order to `paid`, so we wait generously.
    await page.waitForURL(/\/checkout\/success/, { timeout: 60_000 })
    await expect(page.getByText(/gracias por tu compra/i)).toBeVisible()
    // The success page renders the order id as "#<id>" once findOrderById
    // returns the order (which requires the webhook to have landed).
    await expect(page.getByText(/#\d+/)).toBeVisible({ timeout: 30_000 })
  })
})
