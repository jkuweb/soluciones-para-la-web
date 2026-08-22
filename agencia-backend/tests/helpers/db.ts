import type { Payload } from 'payload'

/**
 * Test DB lifecycle helpers.
 *
 * The project uses a real PostgreSQL DB for integration tests (no in-memory
 * adapter). `startMemoryDB` / `stopMemoryDB` are intentional no-ops kept here
 * so tests can opt into a future in-memory adapter without touching specs.
 */
export const startMemoryDB = async (): Promise<void> => {}

export const stopMemoryDB = async (): Promise<void> => {}

/* eslint-disable @typescript-eslint/no-explicit-any */

export const seedTenant = async (
  payload: Payload,
  data: {
    slug: string
    name: string
    features?: Record<string, unknown>
  },
): Promise<{ id: string | number; slug: string }> => {
  const tenant = await payload.create({
    collection: 'tenants',
    data: {
      slug: data.slug,
      name: data.name,
      domain: `${data.slug}.test.local`,
      frontendType: 'nextjs',
      serviceType: 'tienda-online',
      status: 'active',
      features: data.features ?? {},
    } as any,
  })
  return { id: tenant.id, slug: tenant.slug }
}

export const seedUser = async (
  payload: Payload,
  data: {
    email: string
    tenants?: (string | number)[]
    roles?: string
  },
): Promise<{ id: string | number; roles?: string; tenants?: unknown[] }> => {
  const user = await payload.create({
    collection: 'users',
    data: {
      email: data.email,
      password: 'test-password-123',
      roles: data.roles ?? 'tenant-admin',
      tenants: (data.tenants ?? []).map((id) => ({ tenant: id })),
    } as any,
  })
  return user as { id: string | number; roles?: string; tenants?: unknown[] }
}
