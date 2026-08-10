// agencia-backend/src/access/blogEnabledAccess.ts
import type { Access, Where } from 'payload'

type TenantId = string | number

/**
 * Helper interno: dado un user y una instancia de payload, devuelve los
 * IDs de los tenants del user que tienen `blogEnabled: true`.
 *
 * - super-admin: retorna todos los IDs de `user.tenants` (no consulta DB,
 *   confia en que `blogEnabled` esta populado con depth>=1 en el user del
 *   request. Si no, devuelve [] y la operacion se niega — es una postura
 *   segura, no se concede acceso "por las dudas").
 * - tenant user: una sola query batch: `where: { id: { in: ids }, blogEnabled: { equals: true } }`.
 * - sin user: [].
 */
export async function resolveBlogEnabledTenants(args: {
  user: any
  payload: any
}): Promise<TenantId[]> {
  const { user, payload } = args
  if (!user) return []
  if (user?.roles?.includes('super-admin')) {
    const refs = user.tenants || []
    const ids: TenantId[] = []
    for (const t of refs) {
      const tenant = t.tenant
      if (typeof tenant === 'string' || typeof tenant === 'number') {
        ids.push(tenant)
      } else if (tenant && typeof tenant === 'object' && 'id' in tenant) {
        ids.push(tenant.id)
      }
    }
    return ids
  }

  // tenant user: recolectar IDs del user, una sola query
  const refs = user.tenants || []
  const ids: TenantId[] = []
  for (const t of refs) {
    const tenant = t.tenant
    if (typeof tenant === 'string' || typeof tenant === 'number') {
      ids.push(tenant)
    } else if (tenant && typeof tenant === 'object' && 'id' in tenant) {
      ids.push(tenant.id)
    }
  }
  if (ids.length === 0) return []

  const result = await payload.find({
    collection: 'tenants',
    where: {
      and: [{ id: { in: ids } }, { blogEnabled: { equals: true } }],
    },
    limit: ids.length,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })

  return (result.docs || []).map((d: { id: TenantId }) => d.id)
}

/**
 * Access para operaciones autenticadas (no-read) en colecciones del blog.
 *
 * Usado en:
 *   - Posts / Categories / Tags: create, update, delete
 *   - Categories / Tags: read (no son públicas)
 *
 * Comportamiento:
 *   - super-admin: true
 *   - tenant user: where { tenant: { in: allowedIds } } (filtrado por blogEnabled)
 *   - create con data.tenant explícito fuera de allowedIds: false
 *   - sin user: false
 *
 * NOTA: en `create` Payload descarta el where (solo evalúa truthiness),
 * por eso se valida `data.tenant` manualmente acá. En `update` y `delete`
 * el where sí se aplica como constraint a la query.
 */
export const blogEnabledTenantAccess: Access = async (args) => {
  const { req } = args
  const user = req.user
  const payload = req.payload
  if (!user) return false

  const allowedIds = await resolveBlogEnabledTenants({ user, payload })
  if (allowedIds.length === 0) return false

  // En create, si el cliente envió un tenant explícito, debe estar permitido.
  if ('data' in args && args.data && typeof args.data === 'object') {
    const submitted = (args.data as { tenant?: TenantId | { id: TenantId } }).tenant
    if (submitted != null) {
      const submittedId =
        typeof submitted === 'object' && 'id' in submitted
          ? (submitted as { id: TenantId }).id
          : (submitted as TenantId)
      if (!allowedIds.includes(submittedId)) return false
    }
  }

  return { tenant: { in: allowedIds } }
}

/**
 * Read access PÚBLICO (sin auth) para Posts.
 *
 * Solo retorna posts publicados de tenants con `blogEnabled: true`.
 * Es síncrono desde el punto de vista de Payload: retorna un where object.
 * No consulta DB (no puede — el caso es sin user).
 */
export const blogEnabledPublicRead: Access = () => {
  return {
    and: [
      { _status: { equals: 'published' } },
      { 'tenant.blogEnabled': { equals: true } },
    ],
  } as Where
}

/**
 * Read access autenticado para Posts.
 *
 * - super-admin: true (ve todo)
 * - tenant user: where filtrado por sus tenants con blogEnabled=true (incluye drafts)
 * - sin user: delega al read público (published + blogEnabled)
 */
export const blogEnabledPostRead: Access = async ({ req }) => {
  const user = req.user
  const payload = req.payload

  if (user?.roles?.includes('super-admin')) return true

  if (!user) return blogEnabledPublicRead({ req })

  const allowedIds = await resolveBlogEnabledTenants({ user, payload })
  if (allowedIds.length === 0) {
    // Comportamiento defensivo: si un user autenticado no tiene tenants
    // con blog, no ve nada. Coherente con la intención.
    return false
  }
  return { tenant: { in: allowedIds } }
}
