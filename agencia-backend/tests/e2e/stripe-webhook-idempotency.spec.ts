import { test, expect } from '@playwright/test'
import Stripe from 'stripe'
import { getPayload, type Payload } from 'payload'
import config from '@payload-config'

const E2E_BASE_URL = process.env.E2E_BASE_URL
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

// Stripe SDK instance is only used for `webhooks.generateTestHeaderString`, which
// is a static method that does not call the API. The apiVersion matches what
// the backend uses (see /src/lib/stripe.ts).
const stripe = new Stripe('sk_test_unused', {
  apiVersion: '2026-07-29.dahlia',
})

const SETTLE_MS = 250

const SKIP_REASON =
  !WEBHOOK_SECRET || !E2E_BASE_URL
    ? 'STRIPE_WEBHOOK_SECRET and E2E_BASE_URL must be set to run this E2E (requires a running dev server with a real webhook secret).'
    : null

test.describe('Stripe webhook idempotency (E2E with real signature)', () => {
  test.skip(SKIP_REASON !== null, SKIP_REASON ?? '')

  let payload: Payload
  let orderId: string | number

  test.beforeAll(async () => {
    payload = await getPayload({ config })
    const ts = Date.now()

    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        slug: `idem-${ts}`,
        name: `Idempotency ${ts}`,
        domain: `idem-${ts}.test.local`,
        frontendType: 'nextjs',
        serviceType: 'tienda-online',
        status: 'active',
        features: {
          payments: true,
          stripeAccountStatus: 'active',
          stripeAccountId: `acct_idem_${ts}`,
        },
      } as any,
      overrideAccess: true,
    })

    const order = await payload.create({
      collection: 'orders',
      data: {
        tenant: tenant.id,
        customerEmail: `idem-${ts}@test.local`,
        items: [{ productId: 'p_idem', name: 'Idem Product', unitPrice: 1000, quantity: 1 }],
        subtotal: 1000,
        currency: 'USD',
        status: 'pending',
      },
      overrideAccess: true,
    })
    orderId = order.id
  })

  test('replay of checkout.session.completed does not double-update the order', async ({
    request,
  }) => {
    const ts = Date.now()
    const event = {
      id: `evt_idem_${ts}`,
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_idem_${ts}`,
          object: 'checkout.session',
          payment_intent: `pi_idem_${ts}`,
          metadata: { orderId: String(orderId) },
        },
      },
    }
    const body = JSON.stringify(event)
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: body,
      secret: WEBHOOK_SECRET!,
    })

    const res1 = await request.post(`${E2E_BASE_URL}/api/payments/webhook`, {
      headers: {
        'stripe-signature': signature,
        'content-type': 'application/json',
      },
      data: body,
    })
    expect(res1.status()).toBe(200)

    const after1 = await payload.findByID({
      collection: 'orders',
      id: orderId,
      overrideAccess: true,
      depth: 0,
    })
    expect(after1.status).toBe('paid')
    expect(after1.paidAt).toBeTruthy()
    expect(after1.stripePaymentIntentId).toBe(`pi_idem_${ts}`)

    const paidAtBefore = after1.paidAt as string
    const updatedAtBefore = after1.updatedAt as string

    await new Promise((r) => setTimeout(r, SETTLE_MS))

    const res2 = await request.post(`${E2E_BASE_URL}/api/payments/webhook`, {
      headers: {
        'stripe-signature': signature,
        'content-type': 'application/json',
      },
      data: body,
    })
    expect(res2.status()).toBe(200)

    const after2 = await payload.findByID({
      collection: 'orders',
      id: orderId,
      overrideAccess: true,
      depth: 0,
    })
    expect(after2.status).toBe('paid')
    expect(after2.paidAt).toBe(paidAtBefore)
    expect(after2.updatedAt).toBe(updatedAtBefore)
  })
})
