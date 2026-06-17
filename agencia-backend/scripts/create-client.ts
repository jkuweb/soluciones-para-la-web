import path from 'node:path'

// --- Constants ---
export const MONOREPO_ROOT = path.resolve(__dirname, '../../')
export const TEMPLATES_DIR = MONOREPO_ROOT
export const CLIENTS_DIR = '/home/joseba/Clientes/clientes'

export const SLUG_REGEX = /^[a-z0-9-]+$/
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// --- Pure validation utilities ---
export const isValidSlug = (slug: string): boolean =>
  typeof slug === 'string' && slug.length > 0 && SLUG_REGEX.test(slug)

export const isValidEmail = (email: string): boolean =>
  typeof email === 'string' && email.length > 0 && EMAIL_REGEX.test(email)

// --- Types ---
export type ServiceType = 'web-estatica' | 'tienda-online' | 'academia-online'
export type FrontendType = 'astro' | 'nextjs'
export type TenantStatus = 'pending' | 'active' | 'suspended'
export type UserRole = 'tenant-admin' | 'tenant-editor'

export type TenantInput = {
  name: string
  slug: string
  domain: string
  serviceType: ServiceType
  frontendType: FrontendType
  status: TenantStatus
  projectPrice?: number
  maintenanceFee?: number
}

export type UserInput = {
  email: string
  name: string
  password: string
  role: UserRole
}

// --- Pure data builders ---
export const buildTenantData = (input: TenantInput): Record<string, unknown> => {
  const data: Record<string, unknown> = {
    name: input.name,
    slug: input.slug,
    domain: input.domain,
    serviceType: input.serviceType,
    frontendType: input.frontendType,
    status: input.status,
  }
  if (input.projectPrice !== undefined) data.projectPrice = input.projectPrice
  if (input.maintenanceFee !== undefined) data.maintenanceFee = input.maintenanceFee
  return data
}

export const buildUserData = (input: UserInput, tenantId: number): Record<string, unknown> => ({
  email: input.email,
  name: input.name,
  password: input.password,
  roles: [input.role],
  tenants: [{ tenant: tenantId }],
})

export const generateEnvContent = (template: string, slug: string): string =>
  template.replace(/^TENANT_SLUG=.*$/m, `TENANT_SLUG=${slug}`)

// --- DB operations ---
import { getPayload } from 'payload'
import config from '@/payload.config'

export const createTenant = async (
  data: Record<string, unknown>,
): Promise<{ id: number }> => {
  const payload = await getPayload({ config })
  return payload.create({
    collection: 'tenants',
    data: data as never,
  }) as Promise<{ id: number }>
}

export const createUser = async (
  input: UserInput,
  tenantId: number,
): Promise<{ id: number }> => {
  const payload = await getPayload({ config })
  return payload.create({
    collection: 'users',
    data: buildUserData(input, tenantId) as never,
  }) as Promise<{ id: number }>
}

export const deleteTenant = async (tenantId: number): Promise<void> => {
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'tenants', id: tenantId })
}

export const isSlugTaken = async (slug: string): Promise<boolean> => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  return result.totalDocs > 0
}

export const isEmailTaken = async (email: string): Promise<boolean> => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
  })
  return result.totalDocs > 0
}
