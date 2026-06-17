import path from 'node:path'

// Use import.meta.dirname (Node 20.11+), with fallback for safety
const scriptDir = import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname)

// --- Constants ---
export const MONOREPO_ROOT = path.resolve(scriptDir, '../../')
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
import { cp, readFile, writeFile } from 'node:fs/promises'
import * as p from '@clack/prompts'

export const copyTemplate = async (srcDir: string, destDir: string): Promise<void> => {
  await cp(srcDir, destDir, { recursive: true })
}

// --- Interactive prompts ---
const promptUntilFree = async <T>(
  fetcher: () => Promise<T>,
  isTaken: (v: T) => Promise<boolean>,
  invalidMessage: string,
): Promise<T> => {
  for (;;) {
    const value = await fetcher()
    if (p.isCancel(value)) {
      p.cancel('Operación cancelada.')
      process.exit(0)
    }
    if (!(await isTaken(value))) return value
    p.log.warn(invalidMessage)
  }
}

export const promptTenant = async (): Promise<TenantInput> => {
  const name = await p.text({ message: 'Nombre del cliente:' })
  if (p.isCancel(name)) process.exit(0)

  const slug = await promptUntilFree(
    () =>
      p.text({
        message: 'Slug (sin espacios, solo minúsculas/números/guiones):',
        validate: (v) => (v && isValidSlug(v) ? undefined : 'Formato inválido'),
      }) as Promise<string>,
    isSlugTaken,
    'Ese slug ya existe, probá con otro.',
  )

  const domain = await p.text({ message: 'Dominio (ej: cliente.com):' })
  if (p.isCancel(domain)) process.exit(0)

  const serviceType = (await p.select({
    message: 'Tipo de servicio:',
    options: [
      { value: 'web-estatica', label: 'Web Estática' },
      { value: 'tienda-online', label: 'Tienda Online' },
      { value: 'academia-online', label: 'Academia Online' },
    ],
  })) as ServiceType

  const frontendType = (await p.select({
    message: 'Tipo de frontend:',
    options: [
      { value: 'astro', label: 'Astro' },
      { value: 'nextjs', label: 'Next.js' },
    ],
  })) as FrontendType

  const status = (await p.select({
    message: 'Estado:',
    initialValue: 'pending' as TenantStatus,
    options: [
      { value: 'pending', label: 'Pendiente' },
      { value: 'active', label: 'Activo' },
      { value: 'suspended', label: 'Suspendido' },
    ],
  })) as TenantStatus

  const projectPriceStr = await p.text({
    message: 'Precio del proyecto (Enter para omitir):',
  })
  if (p.isCancel(projectPriceStr)) process.exit(0)

  const maintenanceFeeStr = await p.text({
    message: 'Cuota mensual (Enter para omitir):',
  })
  if (p.isCancel(maintenanceFeeStr)) process.exit(0)

  return {
    name: String(name),
    slug,
    domain: String(domain),
    serviceType,
    frontendType,
    status,
    projectPrice: projectPriceStr ? Number(projectPriceStr) : undefined,
    maintenanceFee: maintenanceFeeStr ? Number(maintenanceFeeStr) : undefined,
  }
}

export const promptUser = async (): Promise<UserInput> => {
  const email = await promptUntilFree(
    () =>
      p.text({
        message: 'Email del admin del cliente:',
        validate: (v) => (v && isValidEmail(v) ? undefined : 'Email inválido'),
      }) as Promise<string>,
    isEmailTaken,
    'Ese email ya existe, probá con otro.',
  )

  const name = await p.text({ message: 'Nombre del admin:' })
  if (p.isCancel(name)) process.exit(0)

  const password = await p.password({
    message: 'Password (mínimo 8 caracteres):',
    validate: (v) => (v && v.length >= 8 ? undefined : 'Mínimo 8 caracteres'),
  })
  if (p.isCancel(password)) process.exit(0)

  const role = (await p.select({
    message: 'Rol:',
    initialValue: 'tenant-admin' as UserRole,
    options: [
      { value: 'tenant-admin', label: 'Tenant Admin' },
      { value: 'tenant-editor', label: 'Tenant Editor' },
    ],
  })) as UserRole

  return { email, name: String(name), password: String(password), role }
}

// --- Output ---
export const confirmSummary = async (tenant: TenantInput, user: UserInput): Promise<boolean> => {
  console.log('\n--- Resumen ---')
  console.log(`Tenant: ${tenant.name} (${tenant.slug})`)
  console.log(`  domain: ${tenant.domain}`)
  console.log(`  serviceType: ${tenant.serviceType}`)
  console.log(`  frontendType: ${tenant.frontendType}`)
  console.log(`  status: ${tenant.status}`)
  if (tenant.projectPrice) console.log(`  projectPrice: €${tenant.projectPrice}`)
  if (tenant.maintenanceFee) console.log(`  maintenanceFee: €${tenant.maintenanceFee}`)
  console.log(`User: ${user.email} (${user.role})`)
  console.log('----------------\n')

  const ok = await p.confirm({ message: '¿Crear cliente con estos datos?' })
  if (p.isCancel(ok)) return false
  return ok === true
}

export const printSuccess = (info: {
  tenantSlug: string
  userEmail: string
  userPassword: string
  frontendPath: string
}): void => {
  console.log('\n========================================')
  console.log('  Cliente creado!')
  console.log('========================================')
  console.log(`  Tenant:     ${info.tenantSlug}`)
  console.log(`  User:       ${info.userEmail} / ${info.userPassword}`)
  console.log(`  Frontend:   ${info.frontendPath}`)
  console.log('  Próximos pasos:')
  console.log('    1. Crear las páginas en el admin de Payload')
  console.log(`    2. cd ${info.frontendPath}`)
  console.log('    3. pnpm install')
  console.log('    4. Editar src/styles/theme.css con los colores del cliente')
  console.log('    5. pnpm dev')
  console.log('========================================\n')
}

// --- Orchestrator ---
export const run = async (): Promise<void> => {
  p.intro('Crear nuevo cliente')

  const tenantInput = await promptTenant()
  const userInput = await promptUser()
  const confirmed = await confirmSummary(tenantInput, userInput)
  if (!confirmed) {
    p.cancel('Cancelado.')
    return
  }

  // 1. Crear tenant
  let tenant: { id: number }
  try {
    tenant = await createTenant(buildTenantData(tenantInput))
  } catch (err) {
    p.log.error(`No se pudo crear el tenant: ${(err as Error).message}`)
    throw err
  }
  p.log.success(`Tenant creado (ID: ${tenant.id})`)

  // 2. Crear user (con rollback si falla)
  let user: { id: number }
  try {
    user = await createUser(userInput, tenant.id)
  } catch (err) {
    p.log.error(`No se pudo crear el user, haciendo rollback del tenant...`)
    await deleteTenant(tenant.id)
    throw err
  }
  p.log.success(`User creado (ID: ${user.id})`)

  // 3. Clonar template + generar .env
  const srcDir = path.join(TEMPLATES_DIR, `${tenantInput.frontendType}-starter`)
  const destDir = path.join(CLIENTS_DIR, tenantInput.slug)
  try {
    await copyTemplate(srcDir, destDir)
    const envExample = await readFile(path.join(destDir, '.env.example'), 'utf-8')
    await writeFile(
      path.join(destDir, '.env'),
      generateEnvContent(envExample, tenantInput.slug),
      'utf-8',
    )
    p.log.success(`Frontend clonado en ${destDir}`)
  } catch (err) {
    p.log.warn(
      `Tenant y user quedaron en DB, pero la copia del template falló: ${(err as Error).message}`,
    )
    p.log.warn(`Reintentá manualmente: cp -r ${srcDir} ${destDir}`)
    return
  }

  p.outro('Listo.')
  printSuccess({
    tenantSlug: tenantInput.slug,
    userEmail: userInput.email,
    userPassword: userInput.password,
    frontendPath: destDir,
  })
}

// This script is invoked via scripts/loaders/run-with-css.mjs which calls run() directly.
// No auto-invocation here so that:
// - tests can import { run } and call it without side effects
// - the wrapper (which doesn't pass this file as argv[1]) is the single entry point

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
