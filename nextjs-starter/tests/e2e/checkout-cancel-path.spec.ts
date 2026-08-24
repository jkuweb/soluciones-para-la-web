import { test, expect, request } from '@playwright/test'

/**
 * Checkout cancel-path E2E for the nextjs-starter client.
 *
 * What this exercises (the bits the unit tests can't):
 *   - Stripe-hosted Checkout → cancel_url redirect lands on /checkout/cancel
 *   - The cancel page renders the "Pago cancelado" heading + "Volver al carrito" link
 *   - The Zustand cart store survives a Stripe redirect (localStorage is not
 *     cleared by navigating to a third-party domain and back)
 *
 * What this does NOT need to exercise (already covered elsewhere):
 *   - Currency-mismatch guard on the cart store → covered by
 *     tests/int/store/cart-store.int.spec.ts
 *   - No-stripe (tenant without stripeAccountId) on the checkout route →
 *     covered by tests/int/api/checkout-session.int.spec.ts
 *
 * Why we seed the cart via addInitScript instead of clicking "Agregar al
 * carrito": same reason as checkout-happy-path.spec.ts — the product page's
 * AddToCartButton is intentionally hardcoded `disabled`.
 *
 * Why we navigate directly to /checkout/cancel instead of clicking Stripe's
 * "← Back" link: the link's selector is not part of Stripe's stable API and
 * changes between Stripe releases. The cancel page is static (it does not
 * read the `order_id` query param Stripe appends to cancel_url), so
 * navigating to it exercises the same final state the user lands on after
 * clicking back in Stripe. The full Stripe redirect + UI click is already
 * covered by the happy-path spec.
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
  ? 'STRIPE_SECRET_KEY must be set to run the checkout cancel-path E2E.'
  : SKIP_E2E
    ? 'PLAYWRIGHT_SKIP_E2E=1 — E2E disabled by operator.'
    : null

const TENANT_SLUG = 'mood'
const PLAYWRIGHT_BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const PAYLOAD_API_URL = process.env.PAYLOAD_API_URL ?? `${PLAYWRIGHT_BASE_URL}/api`
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

test.describe('Checkout cancel path', () => {
  test.skip(STATIC_SKIP_REASON !== null, STATIC_SKIP_REASON ?? '')

  let product: DiscoveredProduct | null = null
  let runtimeSkipReason = 'mood product not found'

  test.beforeAll(async () => {
    product = await discoverMoodProduct()
    if (!product) {
      runtimeSkipReason =
        `Could not reach a published product for tenant "${TENANT_SLUG}" via ` +
        `${PAYLOAD_API_URL}. Seed the mood tenant (Task 24) before running.`
    }
  })

  test('user cancels checkout and returns with cart intact', async ({ page }) => {
    test.skip(product === null, runtimeSkipReason)

    // 1. Seed cart via localStorage BEFORE the page loads so the Zustand
    //    persist middleware hydrates with our items. Same shape and key
    //    as checkout-happy-path.spec.ts — `agencia-cart` with
    //    { state: { items, tenantSlug }, version: 0 }.
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

    // 2. Cart page. Each item row renders a "Quitar" button (src/app/cart/page.tsx),
    //    so counting those buttons gives us the item count. The product name
    //    only renders after hydration, so asserting on it doubles as a hydration
    //    barrier.
    await page.goto('/cart')
    await expect(page.getByText(product!.name)).toBeVisible()
    const initialCount = await page.getByRole('button', { name: /^quitar$/i }).count()
    expect(initialCount).toBeGreaterThan(0)

    // 3. Checkout page
    await page.getByRole('link', { name: /ir a checkout/i }).click()
    await expect(page).toHaveURL(/\/checkout$/)
    await expect(page.getByRole('heading', { name: /^checkout$/i })).toBeVisible()

    // 4. Email
    await page.getByLabel(/email/i).fill('test@example.com')

    // 5. Click pay → redirect to Stripe-hosted Checkout
    await page.getByRole('button', { name: /pagar con stripe/i }).click()
    await page.waitForURL(STRIPE_CHECKOUT_HOST, { timeout: 30_000 })

    // 6. Cancel — Stripe's hosted Checkout redirects to `cancel_url`
    //    (configured as `${origin}/checkout/cancel?order_id=...` in
    //    src/lib/stripe.ts) when the user clicks back. The cancel page
    //    is static and ignores the order_id query param, so we navigate
    //    directly to it. This avoids coupling to Stripe's flaky "back"
    //    link selectors.
    await page.goto('/checkout/cancel?order_id=ignored-by-static-page')
    await expect(page).toHaveURL(/\/checkout\/cancel/)
    await expect(page.getByRole('heading', { name: /^pago cancelado$/i })).toBeVisible()
    await expect(page.getByText(/tu carrito sigue intacto/i)).toBeVisible()

    // 7. Cart preservation — the Zustand store survives the round-trip
    //    through Stripe because localStorage is origin-scoped, not tab-
    //    scoped, and Stripe doesn't touch our origin. Navigating back to
    //    /cart should show the same number of items we left with.
    await page.goto('/cart')
    await expect(page.getByText(product!.name)).toBeVisible()
    const finalCount = await page.getByRole('button', { name: /^quitar$/i }).count()
    expect(finalCount).toBe(initialCount)
  })
})
