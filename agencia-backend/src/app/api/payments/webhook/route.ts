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
        const orderId = session.metadata?.orderId
        if (!orderId) {
          console.warn('[payments/webhook] checkout.session.completed missing orderId in metadata')
          return NextResponse.json({ received: true })
        }

        try {
          const order = await payload.findByID({
            collection: 'orders',
            id: orderId,
            depth: 0,
            overrideAccess: true,
          })

          if (order.status === 'pending') {
            await payload.update({
              collection: 'orders',
              id: orderId,
              data: {
                status: 'paid',
                paidAt: new Date().toISOString(),
                stripePaymentIntentId: (session as any).payment_intent ?? null,
              },
              overrideAccess: true,
            })
          }
        } catch {
          console.warn(`[payments/webhook] Order ${orderId} not found or update failed`)
        }
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = session.metadata?.orderId
        if (!orderId) {
          console.warn('[payments/webhook] checkout.session.expired missing orderId in metadata')
          return NextResponse.json({ received: true })
        }

        try {
          const order = await payload.findByID({
            collection: 'orders',
            id: orderId,
            depth: 0,
            overrideAccess: true,
          })

          if (order.status === 'pending') {
            await payload.update({
              collection: 'orders',
              id: orderId,
              data: { status: 'failed', failedReason: 'expired' },
              overrideAccess: true,
            })
          }
        } catch {
          console.warn(`[payments/webhook] Order ${orderId} not found or update failed`)
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
