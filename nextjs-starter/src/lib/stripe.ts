import Stripe from 'stripe'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * Single Stripe instance. Pinned to a specific API version (NOT 'latest')
 * to avoid silent breaking changes. Update this string deliberately when
 * testing against a new SDK.
 */
const STRIPE_API_VERSION = '2024-12-18.acacia'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', {
  apiVersion: STRIPE_API_VERSION,
  typescript: true,
})

// ---------------------------------------------------------------------------
// OAuth state JWT (HMAC-SHA256, no library — keeps the dep footprint small)
// ---------------------------------------------------------------------------

interface OAuthStatePayload {
  tenantSlug: string
  userId: string | number
  nonce: string
  iat: number // seconds
  exp: number // seconds
}

const STATE_TTL_SECONDS = 600 // 10 minutes

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function fromBase64url(input: string): Buffer {
  const padded = input + '='.repeat((4 - (input.length % 4)) % 4)
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

function getSecret(): string {
  const s = process.env.STRIPE_OAUTH_STATE_SECRET
  if (!s) {
    // Dev fallback so the OAuth flow is testable locally without setting it.
    return 'dev-oauth-state-secret-change-in-production'
  }
  return s
}

export function signOAuthState(payload: Omit<OAuthStatePayload, 'iat' | 'exp' | 'nonce'>): string {
  const now = Math.floor(Date.now() / 1000)
  const full: OAuthStatePayload = {
    ...payload,
    nonce: randomBytes(16).toString('hex'),
    iat: now,
    exp: now + STATE_TTL_SECONDS,
  }
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64url(JSON.stringify(full))
  const data = `${header}.${body}`
  const sig = base64url(createHmac('sha256', getSecret()).update(data).digest())
  return `${data}.${sig}`
}

export function verifyOAuthState(token: string): OAuthStatePayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, body, sig] = parts
  const data = `${header}.${body}`
  const expected = createHmac('sha256', getSecret()).update(data).digest()
  const actual = fromBase64url(sig)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null
  }
  let payload: OAuthStatePayload
  try {
    payload = JSON.parse(fromBase64url(body).toString('utf-8'))
  } catch {
    return null
  }
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp < now) return null
  return payload
}

// ---------------------------------------------------------------------------
// Checkout session helpers
// ---------------------------------------------------------------------------

interface CreateCheckoutSessionInput {
  items: {
    productId: string
    name: string
    unitPrice: number
    quantity: number
    imageUrl?: string
  }[]
  currency: string
  customerEmail: string
  orderId: string
  tenantId: string | number
  tenantSlug: string
  stripeAccountId: string
  origin: string
}

export async function createCheckoutSession(input: CreateCheckoutSessionInput) {
  const lineItems = input.items.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency: input.currency.toLowerCase(),
      product_data: {
        name: item.name,
        ...(item.imageUrl ? { images: [item.imageUrl] } : {}),
      },
      unit_amount: item.unitPrice,
    },
  }))
  return stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: lineItems,
    customer_email: input.customerEmail,
    success_url: `${input.origin}/checkout/success?order_id=${input.orderId}`,
    cancel_url: `${input.origin}/checkout/cancel?order_id=${input.orderId}`,
    payment_intent_data: {
      transfer_data: { destination: input.stripeAccountId },
      metadata: {
        orderId: String(input.orderId),
        tenantId: String(input.tenantId),
        tenantSlug: input.tenantSlug,
      },
    },
    metadata: {
      orderId: String(input.orderId),
      tenantId: String(input.tenantId),
      tenantSlug: input.tenantSlug,
    },
  })
}

export async function exchangeOAuthCode(code: string): Promise<{ stripeUserId: string }> {
  const response = await stripe.oauth.token({
    grant_type: 'authorization_code',
    code,
  })
  return { stripeUserId: response.stripe_user_id }
}
