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

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        try {
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
              break
            } catch {
              // Legacy order not found — fall through to the create-from-session path.
            }
          }

          const tenantSlug = session.metadata?.tenantSlug
          if (!tenantSlug) {
            console.warn('[payments/webhook] checkout.session.completed missing tenantSlug in metadata')
            return NextResponse.json({ received: true })
          }

          // New path: no pre-existing order — idempotency check by stripeSessionId,
          // otherwise create from the session's line items (single source of truth).
          const existing = await payload.find({
            collection: 'orders',
            where: { stripeSessionId: { equals: session.id } },
            limit: 1,
            overrideAccess: true,
          })

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
          const tenant = tenants.docs[0]

          const customerEmail =
            session.customer_details?.email ?? session.customer_email ?? null
          if (!customerEmail) {
            console.warn('[payments/webhook] No customer email in session')
            return NextResponse.json({ received: true })
          }

          if (existing.docs.length > 0) {
            // Idempotency: order already created from a previous webhook delivery.
            break
          }

          // No pre-existing order — fetch line items from Stripe and create the order.
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
            limit: 100,
            expand: ['data.price.product'],
          })

          const items = lineItems.data.map((li) => ({
            productId: null,
            productTitle: li.description ?? 'Unknown',
            unitPrice: li.price?.unit_amount ?? 0,
            quantity: li.quantity ?? 1,
          }))
          const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
          const currency = (session.currency ?? 'usd').toUpperCase()

          await payload.create({
            collection: 'orders',
            data: {
              tenant: (tenant as { id: string | number }).id,
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
        } catch (err) {
          console.error(`[payments/webhook] checkout.session.completed failed:`, err)
        }
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session

        try {
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
              break
            } catch {
              // fall through
            }
          }

          const tenantSlug = session.metadata?.tenantSlug
          if (!tenantSlug) {
            console.warn('[payments/webhook] checkout.session.expired missing tenantSlug in metadata')
            return NextResponse.json({ received: true })
          }

          // New path: idempotency check by stripeSessionId.
          const existing = await payload.find({
            collection: 'orders',
            where: { stripeSessionId: { equals: session.id } },
            limit: 1,
            overrideAccess: true,
          })

          if (existing.docs.length > 0) {
            const order = existing.docs[0]
            if ((order as { status?: string }).status === 'pending') {
              await payload.update({
                collection: 'orders',
                id: (order as { id: string | number }).id,
                data: { status: 'failed', failedReason: 'expired' },
                overrideAccess: true,
              })
            }
          }
          // If no pre-existing order, there's nothing to expire (webhook didn't get to
          // create it). The abandoned-cart concept can be a follow-up.
        } catch (err) {
          console.error(`[payments/webhook] checkout.session.expired failed:`, err)
        }
        break
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        const stripeAccountId = account.id

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

          const tenant = tenants.docs[0]
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
        } catch {
          console.warn(`[payments/webhook] Failed to update tenant for account ${stripeAccountId}`)
        }
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error(`[payments/webhook] Error processing ${event.type}:`, err)
  }

  return NextResponse.json({ received: true })
}
