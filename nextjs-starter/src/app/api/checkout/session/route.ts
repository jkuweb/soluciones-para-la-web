import { NextResponse } from 'next/server'
import { findTenantBySlug, recalculateCart } from '@/lib/payload'
import { createCheckoutSession } from '@/lib/stripe'
import { getPayload } from 'payload'
import config from '@payload-config'

interface CheckoutItem {
  productId: string
  quantity: number
  variantId?: string
}

interface CheckoutBody {
  items: CheckoutItem[]
  email: string
  tenantSlug: string
}

function jsonError(code: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: code, ...extra }, { status })
}

export async function POST(req: Request) {
  let body: CheckoutBody
  try {
    body = (await req.json()) as CheckoutBody
  } catch {
    return jsonError('invalid_body', 400)
  }

  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return jsonError('invalid_cart', 400)
  }
  if (!body.email || typeof body.email !== 'string') {
    return jsonError('invalid_body', 400)
  }
  if (!body.tenantSlug || typeof body.tenantSlug !== 'string') {
    return jsonError('invalid_body', 400)
  }

  // 1. Look up tenant
  const tenant = await findTenantBySlug(body.tenantSlug)
  if (!tenant) return jsonError('tenant_not_found', 404)
  if (
    tenant.features?.payments !== true ||
    tenant.features?.stripeAccountStatus !== 'active' ||
    !tenant.features?.stripeAccountId
  ) {
    return jsonError('tenant_not_active', 403)
  }

  // 2. Server-side price recalculation
  let recalculated: {
    items: { productId: string; name: string; unitPrice: number; quantity: number; imageUrl?: string }[]
    subtotal: number
    currency: string
  }
  try {
    recalculated = await recalculateCart(body.items, body.tenantSlug)
  } catch (err: unknown) {
    const e = err as { code?: string; productId?: string }
    if (e?.code === 'currency_mismatch') return jsonError('currency_mismatch', 400)
    if (e?.code === 'invalid_product')
      return jsonError('invalid_product', 400, { productId: e.productId })
    if (e?.code === 'insufficient_stock') return jsonError('insufficient_stock', 400)
    if (e?.code === 'invalid_cart') return jsonError('invalid_cart', 400)
    return jsonError('product_fetch_failed', 500)
  }

  // 3. Create pending Order via Payload Local API
  let orderId: string | number
  try {
    const payload = await getPayload({ config })
    const order = await payload.create({
      collection: 'orders',
      data: {
        tenant: tenant.id,
        customerEmail: body.email,
        items: recalculated.items,
        subtotal: recalculated.subtotal,
        currency: recalculated.currency,
        status: 'pending',
        stripeSessionId: null,
      },
      overrideAccess: true,
    })
    orderId = order.id
  } catch (err) {
    console.error('[checkout-session] Order creation failed:', err)
    return jsonError('order_creation_failed', 500)
  }

  // 4. Create Stripe Checkout session
  let session: { id: string; url: string | null }
  try {
    const origin =
      req.headers.get('origin') ?? `${new URL(req.url).protocol}//${new URL(req.url).host}`
    session = (await createCheckoutSession({
      items: recalculated.items,
      currency: recalculated.currency,
      customerEmail: body.email,
      orderId: String(orderId),
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      stripeAccountId: tenant.features.stripeAccountId!,
      origin,
    })) as { id: string; url: string | null }
  } catch (err) {
    console.error('[checkout-session] Stripe session creation failed:', err)
    return jsonError('stripe_unavailable', 503)
  }

  // 5. Update Order with session id
  try {
    const payload = await getPayload({ config })
    await payload.update({
      collection: 'orders',
      id: orderId,
      data: { stripeSessionId: session.id },
      overrideAccess: true,
    })
  } catch (err) {
    console.error('[checkout-session] Failed to persist session id:', err)
    // Order will be expired by Stripe; not catastrophic.
  }

  return NextResponse.json({ url: session.url, orderId: String(orderId) })
}
