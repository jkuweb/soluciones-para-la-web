import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { startMemoryDB, stopMemoryDB, seedTenant } from '../../helpers/db'

// Mock Stripe to bypass signature verification in tests
const mockConstructEvent = vi.fn()
vi.mock('stripe', () => {
  return {
    default: class MockStripe {
      webhooks = { constructEvent: mockConstructEvent }
      constructor(_secret: string) {}
    },
  }
})

// Set required env vars before importing the handler
process.env.STRIPE_WEBHOOK_SECRET = 'test-webhook-secret'
process.env.STRIPE_SECRET_KEY = 'sk_test_fake'

// We test the handler via Payload Local API (not HTTP).
// This lets us test the business logic without spinning up a real server.
import { POST } from '@/app/api/payments/webhook/route'

describe('Stripe webhook handler', () => {
  let payload: Payload

  beforeAll(async () => {
    await startMemoryDB()
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  afterAll(async () => {
    await stopMemoryDB()
  })

  // Helper to create a minimal Stripe-like event object
  const makeEvent = (type: string, data: Record<string, unknown>) => ({
    id: `evt_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    data: { object: data },
  })

  // Helper to create a request with fake Stripe signature
  // The mock constructEvent parses the body and returns it as the event
  const makeRequest = (event: Record<string, unknown>) => {
    mockConstructEvent.mockImplementation((body: string) => {
      return JSON.parse(body)
    })
    return new Request('http://localhost:3000/api/payments/webhook', {
      method: 'POST',
      body: JSON.stringify(event),
      headers: {
        'stripe-signature': 'test-signature',
        'content-type': 'application/json',
      },
    })
  }

  describe('checkout.session.completed', () => {
    it('updates order from pending to paid with paidAt and stripePaymentIntentId', async () => {
      const ts = Date.now()
      const tenant = await seedTenant(payload, {
        slug: `webhook-test-${ts}`,
        name: `Webhook Test ${ts}`,
        features: { payments: true, stripeAccountStatus: 'active' },
      })

      const order = await payload.create({
        collection: 'orders',
        data: {
          customerEmail: `test-${ts}@example.com`,
          tenant: tenant.id,
          items: [
            {
              productId: 'prod_123',
              name: 'Test Product',
              unitPrice: 1000,
              quantity: 1,
            },
          ],
          subtotal: 1000,
          currency: 'USD',
          status: 'pending',
        } as any,
      })

      const event = makeEvent('checkout.session.completed', {
        id: `cs_test_${ts}`,
        metadata: { orderId: String(order.id) },
        payment_intent: 'pi_test_abc123',
      })

      const req = makeRequest(event)
      const res = await POST(req as any)
      expect(res.status).toBe(200)

      const updated = await payload.findByID({
        collection: 'orders',
        id: order.id,
        depth: 0,
        overrideAccess: true,
      })
      expect(updated.status).toBe('paid')
      expect(updated.paidAt).toBeDefined()
      expect(updated.stripePaymentIntentId).toBe('pi_test_abc123')
    })

    it('returns 200 when orderId is missing from metadata', async () => {
      const event = makeEvent('checkout.session.completed', {
        id: `cs_test_${Date.now()}`,
        metadata: {},
      })

      const req = makeRequest(event)
      const res = await POST(req as any)
      expect(res.status).toBe(200)
    })

    it('returns 200 when order not found', async () => {
      const event = makeEvent('checkout.session.completed', {
        id: `cs_test_${Date.now()}`,
        metadata: { orderId: 'nonexistent-id' },
      })

      const req = makeRequest(event)
      const res = await POST(req as any)
      expect(res.status).toBe(200)
    })

    it('does not update non-pending orders', async () => {
      const ts = Date.now()
      const tenant = await seedTenant(payload, {
        slug: `webhook-noop-${ts}`,
        name: `Webhook Noop ${ts}`,
        features: { payments: true, stripeAccountStatus: 'active' },
      })

      const order = await payload.create({
        collection: 'orders',
        data: {
          customerEmail: `noop-${ts}@example.com`,
          tenant: tenant.id,
          items: [
            {
              productId: 'prod_123',
              name: 'Test Product',
              unitPrice: 1000,
              quantity: 1,
            },
          ],
          subtotal: 1000,
          currency: 'USD',
          status: 'paid',
        } as any,
      })

      const event = makeEvent('checkout.session.completed', {
        id: `cs_test_${ts}`,
        metadata: { orderId: String(order.id) },
      })

      const req = makeRequest(event)
      const res = await POST(req as any)
      expect(res.status).toBe(200)

      const updated = await payload.findByID({
        collection: 'orders',
        id: order.id,
        depth: 0,
        overrideAccess: true,
      })
      expect(updated.status).toBe('paid') // unchanged
    })
  })

  describe('checkout.session.expired', () => {
    it('updates order to failed when session expires', async () => {
      const ts = Date.now()
      const tenant = await seedTenant(payload, {
        slug: `webhook-expire-${ts}`,
        name: `Webhook Expire ${ts}`,
        features: { payments: true, stripeAccountStatus: 'active' },
      })

      const order = await payload.create({
        collection: 'orders',
        data: {
          customerEmail: `expire-${ts}@example.com`,
          tenant: tenant.id,
          items: [
            {
              productId: 'prod_123',
              name: 'Test Product',
              unitPrice: 1000,
              quantity: 1,
            },
          ],
          subtotal: 1000,
          currency: 'USD',
          status: 'pending',
        } as any,
      })

      const event = makeEvent('checkout.session.expired', {
        id: `cs_test_${ts}`,
        metadata: { orderId: String(order.id) },
      })

      const req = makeRequest(event)
      const res = await POST(req as any)
      expect(res.status).toBe(200)

      const updated = await payload.findByID({
        collection: 'orders',
        id: order.id,
        depth: 0,
        overrideAccess: true,
      })
      expect(updated.status).toBe('failed')
      expect((updated as any).failedReason).toBe('expired')
    })

    it('returns 200 when orderId is missing from metadata', async () => {
      const event = makeEvent('checkout.session.expired', {
        id: `cs_test_${Date.now()}`,
        metadata: {},
      })

      const req = makeRequest(event)
      const res = await POST(req as any)
      expect(res.status).toBe(200)
    })

    it('returns 200 when order not found', async () => {
      const event = makeEvent('checkout.session.expired', {
        id: `cs_test_${Date.now()}`,
        metadata: { orderId: 'nonexistent-id' },
      })

      const req = makeRequest(event)
      const res = await POST(req as any)
      expect(res.status).toBe(200)
    })

    it('does not update non-pending orders', async () => {
      const ts = Date.now()
      const tenant = await seedTenant(payload, {
        slug: `webhook-expire-noop-${ts}`,
        name: `Webhook Expire Noop ${ts}`,
        features: { payments: true, stripeAccountStatus: 'active' },
      })

      const order = await payload.create({
        collection: 'orders',
        data: {
          customerEmail: `expire-noop-${ts}@example.com`,
          tenant: tenant.id,
          items: [
            {
              productId: 'prod_123',
              name: 'Test Product',
              unitPrice: 1000,
              quantity: 1,
            },
          ],
          subtotal: 1000,
          currency: 'USD',
          status: 'paid',
        } as any,
      })

      const event = makeEvent('checkout.session.expired', {
        id: `cs_test_${ts}`,
        metadata: { orderId: String(order.id) },
      })

      const req = makeRequest(event)
      const res = await POST(req as any)
      expect(res.status).toBe(200)

      const updated = await payload.findByID({
        collection: 'orders',
        id: order.id,
        depth: 0,
        overrideAccess: true,
      })
      expect(updated.status).toBe('paid') // unchanged
    })
  })

  describe('account.updated', () => {
    it('updates tenant stripeAccountStatus to active when charges and payouts enabled', async () => {
      const ts = Date.now()
      const tenant = await seedTenant(payload, {
        slug: `account-update-${ts}`,
        name: `Account Update ${ts}`,
        features: {
          payments: true,
          stripeAccountId: `acct_test${ts}`,
          stripeAccountStatus: 'pending',
        },
      })

      const event = makeEvent('account.updated', {
        id: `acct_test${ts}`,
        charges_enabled: true,
        payouts_enabled: true,
        requirements: {},
      })

      const req = makeRequest(event)
      const res = await POST(req as any)
      expect(res.status).toBe(200)

      const updated = await payload.findByID({
        collection: 'tenants',
        id: tenant.id,
        depth: 0,
        overrideAccess: true,
      })
      expect((updated.features as any).stripeAccountStatus).toBe('active')
    })

    it('sets tenant to restricted when charges or payouts disabled', async () => {
      const ts = Date.now()
      const tenant = await seedTenant(payload, {
        slug: `account-restrict-${ts}`,
        name: `Account Restrict ${ts}`,
        features: {
          payments: true,
          stripeAccountId: `acct_restrict${ts}`,
          stripeAccountStatus: 'active',
        },
      })

      const event = makeEvent('account.updated', {
        id: `acct_restrict${ts}`,
        charges_enabled: false,
        payouts_enabled: true,
        requirements: {},
      })

      const req = makeRequest(event)
      const res = await POST(req as any)
      expect(res.status).toBe(200)

      const updated = await payload.findByID({
        collection: 'tenants',
        id: tenant.id,
        depth: 0,
        overrideAccess: true,
      })
      expect((updated.features as any).stripeAccountStatus).toBe('restricted')
    })

    it('sets tenant to rejected when requirements.disabled_reason starts with rejected', async () => {
      const ts = Date.now()
      const tenant = await seedTenant(payload, {
        slug: `account-reject-${ts}`,
        name: `Account Reject ${ts}`,
        features: {
          payments: true,
          stripeAccountId: `acct_reject${ts}`,
          stripeAccountStatus: 'active',
        },
      })

      const event = makeEvent('account.updated', {
        id: `acct_reject${ts}`,
        requirements: { disabled_reason: 'rejected.fraud' },
        charges_enabled: false,
        payouts_enabled: false,
      })

      const req = makeRequest(event)
      const res = await POST(req as any)
      expect(res.status).toBe(200)

      const updated = await payload.findByID({
        collection: 'tenants',
        id: tenant.id,
        depth: 0,
        overrideAccess: true,
      })
      expect((updated.features as any).stripeAccountStatus).toBe('rejected')
    })

    it('returns 200 when tenant not found by stripeAccountId', async () => {
      const event = makeEvent('account.updated', {
        id: 'acct_nonexistent',
        charges_enabled: true,
        payouts_enabled: true,
        requirements: {},
      })

      const req = makeRequest(event)
      const res = await POST(req as any)
      expect(res.status).toBe(200)
    })
  })

  describe('unknown events', () => {
    it('returns 200 for unhandled event types', async () => {
      const event = makeEvent('invoice.paid', { id: 'inv_test' })
      const req = makeRequest(event)
      const res = await POST(req as any)
      expect(res.status).toBe(200)
    })
  })
})
