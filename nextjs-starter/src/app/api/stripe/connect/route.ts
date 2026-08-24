import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { signOAuthState } from '@/lib/stripe'

/**
 * GET /api/stripe/connect
 *
 * Inicia el OAuth flow con Stripe Connect Standard. Requiere user logueado
 * y tenant-admin. Genera un `state` JWT firmado con HMAC, lo incluye en la
 * URL de Stripe, y redirige al usuario.
 */
export async function GET(req: Request) {
  const cookieStore = await cookies()
  const userCookie = cookieStore.get('payload-user')
  if (!userCookie) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let user: { id: string | number; tenants: { tenant: { id: string | number; slug: string } | string | number }[]; roles: string[] }
  try {
    user = JSON.parse(Buffer.from(userCookie.value, 'base64').toString('utf-8'))
  } catch {
    return NextResponse.json({ error: 'invalid_session' }, { status: 401 })
  }

  if (!user.roles?.includes('tenant-admin') && !user.roles?.includes('super-admin')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // The user must have exactly one tenant for this MVP. Multi-tenant
  // per-user selection is out of scope.
  if (!user.tenants || user.tenants.length === 0) {
    return NextResponse.json({ error: 'no_tenant' }, { status: 400 })
  }

  const ref = user.tenants[0].tenant
  const tenantSlug = typeof ref === 'object' ? ref.slug : null
  if (!tenantSlug) {
    return NextResponse.json({ error: 'no_tenant_slug' }, { status: 400 })
  }

  const state = signOAuthState({ tenantSlug, userId: user.id })
  const clientId = process.env.STRIPE_CLIENT_ID ?? 'ca_test_placeholder'
  const origin = req.headers.get('origin') ?? `${new URL(req.url).protocol}//${new URL(req.url).host}`
  const redirectUri = `${origin}/api/stripe/connect/callback`

  const url = new URL('https://connect.stripe.com/oauth/authorize')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('scope', 'read_write')
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)

  return NextResponse.redirect(url.toString(), 307)
}
