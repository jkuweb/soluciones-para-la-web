import { findTenantBySlug } from '@/lib/payload'
import { cookies } from 'next/headers'
import Link from 'next/link'

interface PageProps {
  searchParams: { status?: string; error?: string }
}

async function getUserFromCookie(): Promise<{
  id: string | number
  roles: string[]
  tenants: { tenant: { id: string | number; slug: string } | string | number }[]
} | null> {
  const cookieStore = await cookies()
  const userCookie = cookieStore.get('payload-user')
  if (!userCookie) return null
  try {
    return JSON.parse(Buffer.from(userCookie.value, 'base64').toString('utf-8'))
  } catch {
    return null
  }
}

export default async function AdminPagosPage({ searchParams }: PageProps) {
  const user = await getUserFromCookie()
  if (!user) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>Necesitás iniciar sesión</h1>
        <p><Link href="/admin">Volver al admin</Link></p>
      </main>
    )
  }
  if (!user.roles?.includes('tenant-admin') && !user.roles?.includes('super-admin')) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>Acceso denegado</h1>
      </main>
    )
  }

  const ref = user.tenants?.[0]?.tenant
  const tenantSlug = typeof ref === 'object' ? ref.slug : null
  if (!tenantSlug) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>No tenés un tenant asignado</h1>
      </main>
    )
  }

  const tenant = await findTenantBySlug(tenantSlug)
  const stripeAccountId = tenant?.features?.stripeAccountId
  const stripeAccountStatus = tenant?.features?.stripeAccountStatus ?? 'none'

  return (
    <main style={{ padding: '2rem', maxWidth: 600 }}>
      <h1>Pagos</h1>
      <p>Conectá tu cuenta de Stripe para empezar a recibir pagos online.</p>

      {searchParams.status === 'connected' && (
        <p style={{ color: 'green' }}>
          ¡Cuenta conectada! Estamos verificando los datos. Te avisaremos cuando esté activa.
        </p>
      )}
      {searchParams.error === 'connection_failed' && (
        <p style={{ color: 'crimson' }}>
          No se pudo conectar con Stripe. Reintentá o contactanos.
        </p>
      )}

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: '#f5f5f5', borderRadius: 8 }}>
        <h2>Estado</h2>
        {stripeAccountId ? (
          <p>
            <strong>Cuenta Stripe:</strong> {stripeAccountId}<br />
            <strong>Estado:</strong> {stripeAccountStatus}
          </p>
        ) : (
          <p>Aún no conectaste una cuenta de Stripe.</p>
        )}

        {stripeAccountStatus !== 'active' && (
          <a
            href="/api/stripe/connect"
            style={{
              display: 'inline-block',
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              background: '#635BFF',
              color: 'white',
              textDecoration: 'none',
              borderRadius: 4,
              fontWeight: 600,
            }}
          >
            Conectar con Stripe
          </a>
        )}
      </section>
    </main>
  )
}
