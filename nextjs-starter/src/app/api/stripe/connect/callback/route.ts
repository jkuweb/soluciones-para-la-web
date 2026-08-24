import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { verifyOAuthState, exchangeOAuthCode } from '@/lib/stripe'

/**
 * GET /api/stripe/connect/callback?code=...&state=...
 *
 * Verifies the `state` JWT, exchanges the code for an acct_... via Stripe,
 * and updates the Tenant with `stripeAccountId` and
 * `stripeAccountStatus: 'pending'`. Final activation comes from the
 * `account.updated` webhook (Task 5).
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code || !state) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 })
  }

  const payload_ = verifyOAuthState(state)
  if (!payload_) {
    console.warn('[stripe-connect-callback] Invalid or expired state JWT')
    return NextResponse.json({ error: 'invalid_state' }, { status: 400 })
  }

  let stripeUserId: string
  try {
    const result = await exchangeOAuthCode(code)
    stripeUserId = result.stripeUserId
  } catch (err) {
    console.error('[stripe-connect-callback] Stripe token exchange failed:', err)
    const redirectUrl = new URL('/admin/pagos', url.origin)
    redirectUrl.searchParams.set('error', 'connection_failed')
    return NextResponse.redirect(redirectUrl.toString(), 307)
  }

  try {
    const payload = await getPayload({ config })
    await payload.update({
      collection: 'tenants',
      where: { slug: { equals: payload_.tenantSlug } },
      data: {
        'features.stripeAccountId': stripeUserId,
        'features.stripeAccountStatus': 'pending',
      },
      overrideAccess: true,
    })
  } catch (err) {
    console.error('[stripe-connect-callback] Failed to update tenant:', err)
    return NextResponse.json({ error: 'tenant_update_failed' }, { status: 500 })
  }

  const redirectUrl = new URL('/admin/pagos', url.origin)
  redirectUrl.searchParams.set('status', 'connected')
  return NextResponse.redirect(redirectUrl.toString(), 307)
}
