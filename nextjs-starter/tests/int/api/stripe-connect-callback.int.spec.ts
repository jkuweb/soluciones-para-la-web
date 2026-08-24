import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'

const mockToken = vi.fn()
vi.mock('@/lib/stripe', () => ({
  exchangeOAuthCode: vi.fn(async (code: string) => mockToken(code)),
  verifyOAuthState: vi.fn(),
  signOAuthState: vi.fn(),
}))

const mockUpdate = vi.fn()
vi.mock('payload', () => ({
  getPayload: vi.fn(async () => ({
    update: mockUpdate,
  })),
}))

vi.mock('@payload-config', () => ({ default: {} }))

let GET: (req: Request) => Promise<Response>

describe('GET /api/stripe/connect/callback', () => {
  beforeAll(async () => {
    const mod = await import('@/app/api/stripe/connect/callback/route')
    GET = mod.GET
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when state JWT is invalid', async () => {
    const { verifyOAuthState } = await import('@/lib/stripe')
    ;(verifyOAuthState as any).mockReturnValueOnce(null)
    const res = await GET(
      new Request('http://localhost:3000/api/stripe/connect/callback?code=abc&state=bad'),
    )
    expect(res.status).toBe(400)
  })

  it('redirects to /admin/pagos?error=connection_failed when Stripe token exchange fails', async () => {
    const { verifyOAuthState, exchangeOAuthCode } = await import('@/lib/stripe')
    ;(verifyOAuthState as any).mockReturnValueOnce({
      tenantSlug: 't1',
      userId: 1,
      nonce: 'n',
      iat: 0,
      exp: Date.now() / 1000 + 600,
    })
    ;(exchangeOAuthCode as any).mockRejectedValueOnce(new Error('Stripe down'))
    const res = await GET(
      new Request('http://localhost:3000/api/stripe/connect/callback?code=abc&state=good'),
    )
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/admin/pagos?error=connection_failed')
  })

  it('redirects to /admin/pagos?status=connected on success', async () => {
    const { verifyOAuthState, exchangeOAuthCode } = await import('@/lib/stripe')
    ;(verifyOAuthState as any).mockReturnValueOnce({
      tenantSlug: 'mood',
      userId: 1,
      nonce: 'n',
      iat: 0,
      exp: Date.now() / 1000 + 600,
    })
    ;(exchangeOAuthCode as any).mockResolvedValueOnce({ stripeUserId: 'acct_test_xyz' })
    mockUpdate.mockResolvedValueOnce({})

    const res = await GET(
      new Request('http://localhost:3000/api/stripe/connect/callback?code=abc&state=good'),
    )
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/admin/pagos?status=connected')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'tenants',
        where: { slug: { equals: 'mood' } },
      }),
    )
  })

  // Security test (spec §3.7.3 point 4): OAuth state JWT CSRF.
  // A state signed for tenant A must not be usable to apply the connected
  // account to tenant B. The verifyOAuthState mock returns whatever we
  // tell it to, so we simulate the attack by having it return a payload
  // for tenant-a while the attacker provides a `state` token they did
  // not legitimately receive. The handler must use ONLY the verified
  // tenantSlug from the JWT, not anything from the request body or query.
  it('uses tenantSlug from verified state JWT, not from query (CSRF defense)', async () => {
    const { verifyOAuthState, exchangeOAuthCode } = await import('@/lib/stripe')
    // The verified state says tenant-a — the handler MUST update tenant-a,
    // regardless of any other params an attacker might inject.
    ;(verifyOAuthState as any).mockReturnValueOnce({
      tenantSlug: 'tenant-a',
      userId: 1,
      nonce: 'n',
      iat: 0,
      exp: Date.now() / 1000 + 600,
    })
    ;(exchangeOAuthCode as any).mockResolvedValueOnce({ stripeUserId: 'acct_attacker' })
    mockUpdate.mockResolvedValueOnce({})

    // Attacker appends &target=tenant-b to the URL — handler must ignore it.
    const res = await GET(
      new Request(
        'http://localhost:3000/api/stripe/connect/callback?code=abc&state=good&target=tenant-b',
      ),
    )
    expect(res.status).toBe(307)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'tenants',
        where: { slug: { equals: 'tenant-a' } }, // verified value, NOT target=tenant-b
      }),
    )
  })
})
