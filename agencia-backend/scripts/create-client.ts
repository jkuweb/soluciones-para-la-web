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
