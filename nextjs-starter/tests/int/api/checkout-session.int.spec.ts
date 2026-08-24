import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest'

// ── Stripe SDK mocks (must come before route import) ───────────────────────
const mockCreate = vi.fn()
const mockOAuthToken = vi.fn()

vi.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: { sessions: { create: mockCreate } },
    oauth: { token: mockOAuthToken },
  },
  createCheckoutSession: vi.fn(async (input: any) => {
    const session = await mockCreate({ input })
    return session
  }),
  exchangeOAuthCode: vi.fn(async (code: string) => mockOAuthToken(code)),
  signOAuthState: vi.fn((p: any) => `signed.${p.tenantSlug}.${p.userId}`),
  verifyOAuthState: vi.fn((t: string) => {
    const parts = t.split('.')
    if (parts.length !== 3) return null
    return {
      tenantSlug: parts[1],
      userId: parts[2] === 'admin' ? 1 : 99,
      nonce: 'n',
      iat: 0,
      exp: Date.now() / 1000 + 600,
    }
  }),
}))

// ── payload helpers mock ───────────────────────────────────────────────────
const mockRecalculateCart = vi.fn()
const mockFindTenantBySlug = vi.fn()

vi.mock('@/lib/payload', () => ({
  recalculateCart: (...args: any[]) => mockRecalculateCart(...args),
  findTenantBySlug: (...args: any[]) => mockFindTenantBySlug(...args),
  PAYLOAD_API_URL: 'http://localhost:3000/api',
}))

// ── FIX for known bug: also mock the payload package and @payload-config ───
const mockPayloadCreate = vi.fn(async () => ({ id: 'mock-order-id' }))
const mockPayloadUpdate = vi.fn(async () => ({}))

vi.mock('payload', () => ({
  getPayload: vi.fn(async () => ({
    create: mockPayloadCreate,
    update: mockPayloadUpdate,
  })),
}))

vi.mock('@payload-config', () => ({ default: {} }))

// ── Import the route AFTER all mocks are registered ────────────────────────
let POST: (req: Request) => Promise<Response>

describe('POST /api/checkout/session', () => {
  beforeAll(async () => {
    const mod = await import('@/app/api/checkout/session/route')
    POST = mod.POST
  })

  beforeEach(() => {
    mockCreate.mockReset()
    mockPayloadCreate.mockReset()
    mockPayloadUpdate.mockReset()
    mockRecalculateCart.mockReset()
    mockFindTenantBySlug.mockReset()
    mockPayloadCreate.mockResolvedValue({ id: 'mock-order-id' })
    mockPayloadUpdate.mockResolvedValue({})
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 for empty cart', async () => {
    const res = await POST(
      new Request('http://localhost:3000/api/checkout/session', {
        method: 'POST',
        body: JSON.stringify({ items: [], email: 'a@b.c', tenantSlug: 't1' }),
      }),
    )
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('invalid_cart')
  })

  it('returns 400 for malformed body (no email)', async () => {
    const res = await POST(
      new Request('http://localhost:3000/api/checkout/session', {
        method: 'POST',
        body: JSON.stringify({ items: [{ productId: 'p1', quantity: 1 }], tenantSlug: 't1' }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it('returns 403 when tenant is not active', async () => {
    mockFindTenantBySlug.mockResolvedValueOnce({
      id: 1,
      slug: 't1',
      name: 'Tenant 1',
      features: { payments: true, stripeAccountStatus: 'pending', stripeAccountId: null },
    })
    const res = await POST(
      new Request('http://localhost:3000/api/checkout/session', {
        method: 'POST',
        body: JSON.stringify({
          items: [{ productId: 'p1', quantity: 1 }],
          email: 'a@b.c',
          tenantSlug: 't1',
        }),
      }),
    )
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe('tenant_not_active')
  })

  it('returns 400 on currency mismatch after server recalc', async () => {
    mockFindTenantBySlug.mockResolvedValueOnce({
      id: 1,
      slug: 't1',
      name: 'Tenant 1',
      features: { payments: true, stripeAccountStatus: 'active', stripeAccountId: 'acct_1' },
    })
    mockRecalculateCart.mockRejectedValueOnce(
      Object.assign(new Error('Currency mismatch'), { code: 'currency_mismatch' }),
    )
    const res = await POST(
      new Request('http://localhost:3000/api/checkout/session', {
        method: 'POST',
        body: JSON.stringify({
          items: [{ productId: 'p1', quantity: 1 }],
          email: 'a@b.c',
          tenantSlug: 't1',
        }),
      }),
    )
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('currency_mismatch')
  })

  it('uses SERVER price, not client price (security)', async () => {
    mockFindTenantBySlug.mockResolvedValueOnce({
      id: 1,
      slug: 't1',
      name: 'Tenant 1',
      features: { payments: true, stripeAccountStatus: 'active', stripeAccountId: 'acct_1' },
    })
    mockRecalculateCart.mockResolvedValueOnce({
      items: [{ productId: 'p1', name: 'Real Product', unitPrice: 5000, quantity: 1 }],
      subtotal: 5000,
      currency: 'USD',
    })
    mockCreate.mockResolvedValueOnce({ id: 'cs_1', url: 'https://checkout.stripe.com/c/cs_1' })
    const res = await POST(
      new Request('http://localhost:3000/api/checkout/session', {
        method: 'POST',
        body: JSON.stringify({
          items: [{ productId: 'p1', quantity: 1, unitPrice: 1 }], // client tries to pay $0.01
          email: 'a@b.c',
          tenantSlug: 't1',
        }),
      }),
    )
    expect(res.status).toBe(200)
    // The line item price should be 5000 (server), not 1 (client)
    const stripeCall = mockCreate.mock.calls[0][0]
    expect(stripeCall.input.items[0].unitPrice).toBe(5000)
  })

  it('returns 200 with session URL on success', async () => {
    mockFindTenantBySlug.mockResolvedValueOnce({
      id: 1,
      slug: 't1',
      name: 'Tenant 1',
      features: { payments: true, stripeAccountStatus: 'active', stripeAccountId: 'acct_1' },
    })
    mockRecalculateCart.mockResolvedValueOnce({
      items: [{ productId: 'p1', name: 'X', unitPrice: 1000, quantity: 2 }],
      subtotal: 2000,
      currency: 'USD',
    })
    mockCreate.mockResolvedValueOnce({ id: 'cs_2', url: 'https://stripe.com/cs_2' })

    const res = await POST(
      new Request('http://localhost:3000/api/checkout/session', {
        method: 'POST',
        body: JSON.stringify({
          items: [{ productId: 'p1', quantity: 2 }],
          email: 'a@b.c',
          tenantSlug: 't1',
        }),
      }),
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.url).toBe('https://stripe.com/cs_2')
  })
})
