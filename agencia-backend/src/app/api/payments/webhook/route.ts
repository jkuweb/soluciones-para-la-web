import { NextResponse, type NextRequest } from 'next/server'
import Stripe from 'stripe'
import { getPayload } from 'payload'
import config from '@payload-config'

const getStripe = () => {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) return null
  return new Stripe(secret)
}

const getWebhookSecret = () => process.env.STRIPE_WEBHOOK_SECRET ?? null

function computeAccountStatus(account: Stripe.Account): string {
  if (account.requirements?.disabled_reason?.startsWith('rejected.')) return 'rejected'
  if (account.charges_enabled && account.payouts_enabled) return 'active'
  if (!account.charges_enabled || !account.payouts_enabled) return 'restricted'
  return 'pending'
}

export const POST = async (req: NextRequest): Promise<NextResponse> => {
  const webhookSecret = getWebhookSecret()
  if (!webhookSecret) {
    console.error('[payments/webhook] STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const stripe = getStripe()
  if (!stripe) {
    console.error('[payments/webhook] STRIPE_SECRET_KEY not configured')
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    const body = await req.text()
    const sig = req.headers.get('stripe-signature')
    if (!sig) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('[payments/webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const payload = await getPayload({ config })

  switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Legacy path: pre-existing order looked up by metadata.orderId.
        // The storefront used to create the order locally before Stripe checkout.
        const legacyOrderId = session.metadata?.orderId
        if (legacyOrderId) {
          try {
            const order = await payload.findByID({
              collection: 'orders',
              id: legacyOrderId,
              depth: 0,
              overrideAccess: true,
            })
            if ((order as { status?: string }).status === 'pending') {
              await payload.update({
                collection: 'orders',
                id: legacyOrderId,
                data: {
                  status: 'paid',
                  paidAt: new Date().toISOString(),
                  stripeSessionId: session.id,
                  stripePaymentIntentId:
                    typeof session.payment_intent === 'string'
                      ? session.payment_intent
                      : (session.payment_intent?.id ?? null),
                },
                overrideAccess: true,
              })
            }
            return NextResponse.json({ received: true })
          } catch {
            // Legacy order not found or update failed — fall through to the create-from-session path.
          }
        }

        // New path preconditions. Return 200 — Stripe cannot fix these by retrying,
        // they're about the data Stripe sent us, not transient infra.
        const tenantSlug = session.metadata?.tenantSlug
        if (!tenantSlug) {
          console.warn('[payments/webhook] checkout.session.completed missing tenantSlug in metadata')
          return NextResponse.json({ received: true })
        }
        const customerEmail =
          session.customer_details?.email ?? session.customer_email ?? null
        if (!customerEmail) {
          console.warn('[payments/webhook] No customer email in session')
          return NextResponse.json({ received: true })
        }

        // New path mutations + reads. Any failure returns 500 so Stripe retries —
        // previously the outer catch swallowed these and returned 200, which meant
        // a failed payload.create() left the order missing AND lied to Stripe.
        try {
          const tenants = await payload.find({
            collection: 'tenants',
            where: { slug: { equals: tenantSlug } },
            limit: 1,
            overrideAccess: true,
          })
          if (tenants.docs.length === 0) {
            console.warn(`[payments/webhook] No tenant found for slug ${tenantSlug}`)
            return NextResponse.json({ received: true })
          }
          const tenant = tenants.docs[0]!

          // Idempotency: a previous delivery already created the order.
          const existing = await payload.find({
            collection: 'orders',
            where: { stripeSessionId: { equals: session.id } },
            limit: 1,
            overrideAccess: true,
          })
          if (existing.docs.length > 0) {
            return NextResponse.json({ received: true })
          }

          // Fetch line items from Stripe and create the order.
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
            limit: 100,
            expand: ['data.price.product'],
          })

          const items = lineItems.data.map((li) => {
            // price.product is either a string id (prod_xxx) or, when expanded,
            // the full Stripe Product object. Snapshot whichever is available —
            // there's no Payload Product reference because the storefront uses
            // inline price_data, not pre-stored Products.
            const priceProduct = li.price?.product
            const stripeProductId =
              typeof priceProduct === 'string'
                ? priceProduct
                : (priceProduct as { id?: string } | undefined)?.id ?? ''
            return {
              productId: stripeProductId,
              name: li.description ?? 'Unknown',
              unitPrice: li.price?.unit_amount ?? 0,
              quantity: li.quantity ?? 1,
            }
          })
          const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
          const currency = (session.currency ?? 'usd').toUpperCase()

          await payload.create({
            collection: 'orders',
            data: {
              tenant: tenant.id,
              customerEmail,
              items,
              subtotal,
              currency,
              status: 'paid',
              stripeSessionId: session.id,
              stripePaymentIntentId:
                typeof session.payment_intent === 'string'
                  ? session.payment_intent
                  : (session.payment_intent?.id ?? null),
              paidAt: new Date().toISOString(),
            },
            overrideAccess: true,
          })
          return NextResponse.json({ received: true })
        } catch (err) {
          console.error(`[payments/webhook] checkout.session.completed failed:`, err)
          return NextResponse.json(
            { error: 'order_creation_failed' },
            { status: 500 },
          )
        }
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session

        // Legacy path: update pre-existing order by metadata.orderId.
        const legacyOrderId = session.metadata?.orderId
        if (legacyOrderId) {
          try {
            const order = await payload.findByID({
              collection: 'orders',
              id: legacyOrderId,
              depth: 0,
              overrideAccess: true,
            })
            if ((order as { status?: string }).status === 'pending') {
              await payload.update({
                collection: 'orders',
                id: legacyOrderId,
                data: { status: 'failed', failedReason: 'expired' },
                overrideAccess: true,
              })
            }
            return NextResponse.json({ received: true })
          } catch {
            // fall through to the new path
          }
        }

        // New path preconditions. Return 200 — Stripe cannot fix these by retrying.
        const tenantSlug = session.metadata?.tenantSlug
        if (!tenantSlug) {
          console.warn('[payments/webhook] checkout.session.expired missing tenantSlug in metadata')
          return NextResponse.json({ received: true })
        }

        // New path mutations. Any failure returns 500 so Stripe retries.
        try {
          // Idempotency check by stripeSessionId.
          const existing = await payload.find({
            collection: 'orders',
            where: { stripeSessionId: { equals: session.id } },
            limit: 1,
            overrideAccess: true,
          })

          if (existing.docs.length > 0) {
            const order = existing.docs[0]!
            if ((order as { status?: string }).status === 'pending') {
              await payload.update({
                collection: 'orders',
                id: order.id,
                data: { status: 'failed', failedReason: 'expired' },
                overrideAccess: true,
              })
            }
          }
          // If no pre-existing order, there's nothing to expire (webhook didn't get to
          // create it). The abandoned-cart concept can be a follow-up.
          return NextResponse.json({ received: true })
        } catch (err) {
          console.error(`[payments/webhook] checkout.session.expired failed:`, err)
          return NextResponse.json(
            { error: 'order_expiration_failed' },
            { status: 500 },
          )
        }
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        const stripeAccountId = account.id

        // Precondition: known tenant. Return 200 — Stripe cannot fix this by retrying.
        try {
          const tenants = await payload.find({
            collection: 'tenants',
            where: { 'features.stripeAccountId': { equals: stripeAccountId } },
            limit: 1,
            depth: 0,
            overrideAccess: true,
          })

          if (tenants.docs.length === 0) {
            console.warn(`[payments/webhook] No tenant found for Stripe account ${stripeAccountId}`)
            return NextResponse.json({ received: true })
          }

          const tenant = tenants.docs[0]!
          const stripeAccountStatus = computeAccountStatus(account)

          await payload.update({
            collection: 'tenants',
            id: tenant.id,
            data: {
              features: {
                ...(tenant.features as Record<string, unknown>),
                stripeAccountStatus,
              },
            },
            overrideAccess: true,
          })
          return NextResponse.json({ received: true })
        } catch (err) {
          // Any failure here (DB blip, schema mismatch, etc.) returns 500 so
          // Stripe retries. Previously this catch swallowed the error.
          console.error(`[payments/webhook] account.update for ${stripeAccountId} failed:`, err)
          return NextResponse.json(
            { error: 'tenant_update_failed' },
            { status: 500 },
          )
        }
      }

      default:
        return NextResponse.json({ received: true })
    }
}
