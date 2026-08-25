/**
 * Smoke setup: prepara el tenant `mood` para tests de payments.
 *
 * - Encuentra el tenant `mood` (lo crea `pnpm create-client`).
 *   Si no existe → FALLA con instrucciones claras.
 * - Parchea `features` con payments config (payments, stripeAccountStatus, stripeAccountId).
 * - Crea (o actualiza) dos productos smoke: uno USD y uno EUR.
 * - Idempotente: corriendo dos veces produce el mismo resultado.
 *
 * Uso:
 *   pnpm seed:mood-payments
 *
 * Env vars opcionales:
 *   STRIPE_ACCOUNT_ID_MOOD  acct_... de Stripe Connect para el tenant mood.
 *                           Si falta, usa el placeholder `acct_smoke_mood_placeholder`
 *                           (suficiente para smoke tests con Stripe en modo test).
 */
import { getPayload } from 'payload'
import config from '@/payload.config'

export const TENANT_SLUG = 'mood'
export const STRIPE_ACCOUNT_ID_ENV = 'STRIPE_ACCOUNT_ID_MOOD'
export const STRIPE_ACCOUNT_ID_PLACEHOLDER = 'acct_smoke_mood_placeholder'

export type SmokeProduct = {
  title: string
  slug: string
  price: number
  currency: 'USD' | 'EUR'
}

export const SMOKE_PRODUCTS: readonly SmokeProduct[] = [
  { title: 'Smoke Test Product USD', slug: 'smoke-usd', price: 1999, currency: 'USD' },
  { title: 'Smoke Test Product EUR', slug: 'smoke-eur', price: 1999, currency: 'EUR' },
] as const

// --- Pure helpers ---

export const resolveStripeAccountId = (): string =>
  process.env[STRIPE_ACCOUNT_ID_ENV] ?? STRIPE_ACCOUNT_ID_PLACEHOLDER

export const buildPaymentsFeatures = (
  currentFeatures: Record<string, unknown>,
  stripeAccountId: string,
): Record<string, unknown> => ({
  ...currentFeatures,
  payments: true,
  stripeAccountStatus: 'active',
  stripeAccountId,
})

// --- DB ops ---

export const findTenantBySlug = async (
  payload: Awaited<ReturnType<typeof getPayload>>,
  slug: string,
): Promise<{ id: number; features?: Record<string, unknown> } | null> => {
  const result = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    limit: 1,
    overrideAccess: true,
  })
  if (result.totalDocs === 0) return null
  const doc = result.docs[0] as { id: number; features?: Record<string, unknown> }
  return doc
}

export const updateTenantPaymentsFeatures = async (
  payload: Awaited<ReturnType<typeof getPayload>>,
  tenantId: number,
  features: Record<string, unknown>,
): Promise<void> => {
  await payload.update({
    collection: 'tenants',
    id: tenantId,
    data: { features },
    overrideAccess: true,
  })
}

export const findProductBySlug = async (
  payload: Awaited<ReturnType<typeof getPayload>>,
  tenantId: number,
  slug: string,
): Promise<{ id: number } | null> => {
  const result = await payload.find({
    collection: 'products',
    where: {
      and: [{ slug: { equals: slug } }, { tenant: { equals: tenantId } }],
    },
    limit: 1,
    overrideAccess: true,
  })
  if (result.totalDocs === 0) return null
  const doc = result.docs[0] as { id: number }
  return doc
}

export const upsertSmokeProduct = async (
  payload: Awaited<ReturnType<typeof getPayload>>,
  tenantId: number,
  product: SmokeProduct,
): Promise<'created' | 'updated'> => {
  const existing = await findProductBySlug(payload, tenantId, product.slug)
  const data = {
    title: product.title,
    slug: product.slug,
    price: product.price,
    currency: product.currency,
    status: 'published' as const,
    stock: 100,
    tenant: tenantId,
  }
  if (existing) {
    await payload.update({
      collection: 'products',
      id: existing.id,
      data,
      overrideAccess: true,
    })
    return 'updated'
  }
  await payload.create({
    collection: 'products',
    data,
    overrideAccess: true,
  })
  return 'created'
}

// --- Output helpers ---

export const printTenantUpdated = (tenantId: number, stripeAccountId: string): void => {
  console.log(`✓ Tenant "${TENANT_SLUG}" (id ${tenantId}) updated:`)
  console.log('    features.payments = true')
  console.log("    features.stripeAccountStatus = 'active'")
  console.log(`    features.stripeAccountId = ${stripeAccountId}`)
}

export const printProductUpserted = (
  product: SmokeProduct,
  action: 'created' | 'updated',
): void => {
  const verb = action === 'created' ? 'created' : 'updated'
  console.log(
    `✓ Product ${verb}: ${product.title} (slug: ${product.slug}, currency: ${product.currency})`,
  )
}

export const printNextSteps = (stripeAccountId: string): void => {
  console.log('\n=== Smoke setup complete ===')
  console.log(`Tenant "${TENANT_SLUG}" listo para smoke tests de payments.`)
  console.log('\nPróximos pasos:')
  console.log(`  1. Si usás el placeholder, configurá ${STRIPE_ACCOUNT_ID_ENV} en .env`)
  console.log(`     (acct real de Stripe Connect). Actual: ${stripeAccountId}`)
  console.log(`  2. Si el tenant no tiene catalog: true todavía, prendelo con:`)
  console.log(`       pnpm add-feature catalog --slug=${TENANT_SLUG}`)
  console.log(`     (necesario para que el storefront muestre los productos vía API)`)
  console.log(`  3. Corré el smoke test:`)
  console.log(`       pnpm test:e2e`)
  console.log(`  4. Verificá manualmente desde el admin:`)
  console.log(`       - Tenant "mood" → features.payments = true`)
  console.log(`       - Productos: smoke-usd y smoke-eur (publicados)`)
  console.log('=============================\n')
}

export const printTenantMissing = (): void => {
  console.error(`\n✗ Tenant "${TENANT_SLUG}" no existe.`)
  console.error(`\nAntes de correr este script, creá el tenant con:`)
  console.error(`  pnpm create-client`)
  console.error(`\nRespondé "mood" cuando te pida el slug. Después:`)
  console.error(`  pnpm seed:mood-payments`)
  console.error('')
}

// --- Orchestrator ---

export const run = async (): Promise<void> => {
  const payload = await getPayload({ config })

  // 1. Find tenant (must already exist — created via pnpm create-client).
  const tenant = await findTenantBySlug(payload, TENANT_SLUG)
  if (!tenant) {
    printTenantMissing()
    process.exit(1)
  }

  // 2. Patch features with payments config.
  const stripeAccountId = resolveStripeAccountId()
  const currentFeatures = tenant.features ?? {}
  const newFeatures = buildPaymentsFeatures(currentFeatures, stripeAccountId)
  await updateTenantPaymentsFeatures(payload, tenant.id, newFeatures)
  printTenantUpdated(tenant.id, stripeAccountId)

  // 3. Upsert smoke products.
  for (const product of SMOKE_PRODUCTS) {
    const action = await upsertSmokeProduct(payload, tenant.id, product)
    printProductUpserted(product, action)
  }

  // 4. Print next steps.
  printNextSteps(stripeAccountId)

  // Payload keeps DB connections open; explicit exit prevents the wrapper hanging.
  process.exit(0)
}
