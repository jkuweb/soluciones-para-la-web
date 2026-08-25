/**
 * Combined seed for the `mood` tenant: payments + catalog flags, 4 categories,
 * 12 sneaker products, 2 smoke products.
 *
 * Closes the catalog: true gap from seed-mood-payments.ts.
 *
 * Uso:
 *   pnpm seed:mood-full
 *
 * Env vars opcionales:
 *   STRIPE_ACCOUNT_ID_MOOD  acct_... de Stripe Connect para el tenant mood.
 *                           Si falta, usa el placeholder `acct_smoke_mood_placeholder`.
 */
import { getPayload } from 'payload'
import config from '@/payload.config'
import {
  TENANT_SLUG,
  resolveStripeAccountId,
  SMOKE_PRODUCTS,
  type SmokeProduct,
} from './seed-mood-payments'

export { TENANT_SLUG }

// --- Types ---

type CategorySeed = {
  name: string
  slug: string
  description?: string
}

export type SneakerProduct = {
  title: string
  slug: string
  description: string
  price: number
  compareAtPrice?: number
  currency: 'USD' | 'EUR'
  categorySlug: string
  stock: number
  sku: string
}

type PayloadProductData = {
  title: string
  slug: string
  description: ReturnType<typeof makeRichText>
  price: number
  compareAtPrice?: number
  currency: 'USD' | 'EUR'
  images: []
  category?: number
  stock: number
  sku: string
  status: 'published'
  tenant: number
}

// --- Constants ---

export const CATEGORIES: readonly CategorySeed[] = [
  {
    name: 'Running',
    slug: 'running',
    description: 'Zapatillas de running para entrenamiento diario, tiradas largas y carreras.',
  },
  {
    name: 'Basketball',
    slug: 'basketball',
    description: 'Zapatillas de basketball con amortiguación reactiva y soporte lateral.',
  },
  {
    name: 'Casual',
    slug: 'casual',
    description: 'Estilo urbano para el día a día. Comodidad sin renunciar al diseño.',
  },
  {
    name: 'Limited Editions',
    slug: 'limited-editions',
    description: 'Drops exclusivos y ediciones limitadas. Pocas unidades disponibles.',
  },
] as const

export const SNEAKER_PRODUCTS: readonly SneakerProduct[] = [
  // Running
  {
    title: 'Nike Pegasus 41',
    slug: 'nike-pegasus-41',
    description:
      'Zapatillas de running con amortiguación React Foam para entrenamientos diarios y tiradas largas.',
    price: 14999,
    currency: 'USD',
    categorySlug: 'running',
    stock: 100,
    sku: 'NK-PEG-41',
  },

  {
    title: 'Adidas Ultraboost Light',
    slug: 'adidas-ultraboost-light',
    description:
      'Las Ultraboost más ligeras hasta la fecha. Espuma Light BOOST para máxima reactividad.',
    price: 18999,
    compareAtPrice: 21999,
    currency: 'USD',
    categorySlug: 'running',
    stock: 60,
    sku: 'AD-UB-LT',
  },

  {
    title: 'New Balance Fresh Foam 1080',
    slug: 'new-balance-fresh-foam-1080',
    description:
      'Máxima amortiguación con Fresh Foam X. Ideales para corredores de larga distancia que buscan comfort.',
    price: 16499,
    currency: 'EUR',
    categorySlug: 'running',
    stock: 80,
    sku: 'NB-FF-1080',
  },

  {
    title: 'Asics Gel-Kayano 30',
    slug: 'asics-gel-kayano-30',
    description:
      'Estabilidad y soporte para pronadores. Tecnología FF BLAST PLUS para una pisada más suave.',
    price: 16999,
    currency: 'EUR',
    categorySlug: 'running',
    stock: 70,
    sku: 'AS-GK-30',
  },

  // Basketball
  {
    title: 'Air Jordan 1 Mid',
    slug: 'air-jordan-1-mid',
    description:
      'El icónico Jordan 1 en su versión mid. Cuero premium y amortiguación Air-Sole en el talón.',
    price: 12999,
    currency: 'USD',
    categorySlug: 'basketball',
    stock: 50,
    sku: 'AJ1-MID',
  },

  {
    title: 'Nike Kobe 8 Protro',
    slug: 'nike-kobe-8-protro',
    description:
      'Reedición del clásico Kobe 8 con amortiguación React moderna y construcción low-top para máxima movilidad.',
    price: 18999,
    currency: 'USD',
    categorySlug: 'basketball',
    stock: 30,
    sku: 'NK-KB8-P',
  },

  {
    title: 'Adidas Harden Vol. 7',
    slug: 'adidas-harden-vol-7',
    description: 'La firma de James Harden. Suela BOOST para explosividad en cada salto y corte.',
    price: 15999,
    currency: 'EUR',
    categorySlug: 'basketball',
    stock: 45,
    sku: 'AD-HV7',
  },

  // Casual
  {
    title: 'Adidas Stan Smith',
    slug: 'adidas-stan-smith',
    description: 'El clásico blanco y verde. Cuero sintético, suela de goma, atemporal.',
    price: 9999,
    currency: 'EUR',
    categorySlug: 'casual',
    stock: 200,
    sku: 'AD-SS',
  },

  {
    title: 'Vans Old Skool',
    slug: 'vans-old-skool',
    description:
      'Las zapatillas que empezaron todo. Lona resistente, suela waffle icónica, raya lateral.',
    price: 7999,
    currency: 'EUR',
    categorySlug: 'casual',
    stock: 250,
    sku: 'VN-OS',
  },

  {
    title: 'Converse Chuck Taylor All Star',
    slug: 'converse-chuck-taylor-all-star',
    description: 'Las originales. Lona de algodón, suela de goma vulcanizada, inconfundibles.',
    price: 6999,
    currency: 'EUR',
    categorySlug: 'casual',
    stock: 300,
    sku: 'CN-CT-AS',
  },

  // Limited Editions
  {
    title: 'Yeezy Boost 350 V2',
    slug: 'yeezy-boost-350-v2',
    description: 'Drop exclusivo. Primeknit, tecnología BOOST, edición limitada.',
    price: 22999,
    compareAtPrice: 25999,
    currency: 'USD',
    categorySlug: 'limited-editions',
    stock: 5,
    sku: 'YZ-350V2',
  },

  {
    title: 'New Balance 990v6 MiUSA',
    slug: 'new-balance-990v6-miusa',
    description:
      'Fabricadas en Estados Unidos. Construcción premium, ENCAP y FuelCell para comfort diario.',
    price: 19999,
    currency: 'EUR',
    categorySlug: 'limited-editions',
    stock: 8,
    sku: 'NB-990V6',
  },
] as const

// --- Pure helpers ---

export const makeRichText = (text: string) => ({
  root: {
    type: 'root' as const,
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: [
      {
        type: 'text' as const,
        format: 0,
        style: '',
        text,
        mode: 'normal' as const,
        detail: 0,
        version: 1,
      },
    ],
  },
})

export const buildFeatures = (
  currentFeatures: Record<string, unknown>,
  stripeAccountId: string,
): Record<string, unknown> => ({
  ...currentFeatures,
  payments: true,
  catalog: true,
  stripeAccountStatus: 'active',
  stripeAccountId,
})

export const productToData = (
  product: SneakerProduct,
  categoryId: number,
  tenantId: number,
): PayloadProductData => {
  const data: PayloadProductData = {
    title: product.title,
    slug: product.slug,
    description: makeRichText(product.description),
    price: product.price,
    currency: product.currency,
    images: [],
    category: categoryId,
    stock: product.stock,
    sku: product.sku,
    status: 'published',
    tenant: tenantId,
  }
  if (product.compareAtPrice !== undefined) {
    data.compareAtPrice = product.compareAtPrice
  }
  return data
}

export const adaptSmokeProduct = (product: SmokeProduct, tenantId: number): PayloadProductData => ({
  title: product.title,
  slug: product.slug,
  description: makeRichText(`Smoke test product for ${product.currency} currency validation.`),
  price: product.price,
  currency: product.currency,
  images: [],
  category: undefined,
  stock: 100,
  sku: `SMOKE-${product.currency}`,
  status: 'published',
  tenant: tenantId,
})

// --- DB ops ---

export const findCategoryBySlug = async (
  payload: Awaited<ReturnType<typeof getPayload>>,
  tenantId: number,
  slug: string,
): Promise<{ id: number } | null> => {
  const result = await payload.find({
    collection: 'product-categories',
    where: {
      and: [{ slug: { equals: slug } }, { tenant: { equals: tenantId } }],
    },
    limit: 1,
    overrideAccess: true,
  })
  if (result.totalDocs === 0) return null
  return result.docs[0] as { id: number }
}

export const upsertCategory = async (
  payload: Awaited<ReturnType<typeof getPayload>>,
  tenantId: number,
  category: CategorySeed,
): Promise<'created' | 'updated'> => {
  const existing = await findCategoryBySlug(payload, tenantId, category.slug)
  const data = {
    name: category.name,
    slug: category.slug,
    ...(category.description !== undefined ? { description: category.description } : {}),
    tenant: tenantId,
  }
  if (existing) {
    await payload.update({
      collection: 'product-categories',
      id: existing.id,
      data,
      overrideAccess: true,
    })
    return 'updated'
  }
  await payload.create({
    collection: 'product-categories',
    data,
    overrideAccess: true,
  })
  return 'created'
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
  return result.docs[0] as { id: number }
}

export const upsertProduct = async (
  payload: Awaited<ReturnType<typeof getPayload>>,
  tenantId: number,
  data: PayloadProductData,
): Promise<'created' | 'updated'> => {
  const existing = await findProductBySlug(payload, tenantId, data.slug)
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

export const printBanner = (): void => {
  console.log('\n=== seed:mood-full ===')
  console.log(`Tenant target: ${TENANT_SLUG}`)
  console.log('')
}

export const printFeatureUpdate = (tenantId: number, stripeAccountId: string): void => {
  console.log(`✓ Tenant "${TENANT_SLUG}" (id ${tenantId}) features updated:`)
  console.log('    features.payments           = true')
  console.log('    features.catalog            = true')
  console.log("    features.stripeAccountStatus = 'active'")
  console.log(`    features.stripeAccountId    = ${stripeAccountId}`)
}

export const printCategoryUpserted = (
  category: CategorySeed,
  action: 'created' | 'updated',
): void => {
  console.log(`  ${action === 'created' ? '+' : '~'} Category: ${category.name} (${category.slug})`)
}

export const printProductUpserted = (
  product: { title: string; slug: string; currency: string; price: number },
  action: 'created' | 'updated',
): void => {
  const verb = action === 'created' ? '+' : '~'
  console.log(`  ${verb} Product: ${product.title} [${product.currency}] (${product.slug})`)
}

export const printSummary = (stats: { categories: number; products: number }): void => {
  console.log('')
  console.log(`Summary: ${stats.categories} categories, ${stats.products} products`)
}

export const printNextSteps = (stripeAccountId: string): void => {
  console.log('\n=== Setup complete ===')
  console.log(`Tenant "${TENANT_SLUG}" listo para la verificación E2E de Task 25.`)
  if (stripeAccountId === 'acct_smoke_mood_placeholder') {
    console.log(`\n⚠ Estás usando el placeholder de Stripe. Para el E2E real:`)
    console.log(`    export STRIPE_ACCOUNT_ID_MOOD=acct_test_...`)
    console.log(`    cd agencia-backend && pnpm seed:mood-full`)
  }
  console.log('\nPróximos pasos:')
  console.log('  1. Verificá en admin: http://localhost:3000/admin/collections/products')
  console.log('  2. Cuando hagas el E2E de Task 25, usá los productos seedeados.')
  console.log('=============================\n')
}

export const printTenantMissing = (): void => {
  console.error(`\n✗ Tenant "${TENANT_SLUG}" no existe.`)
  console.error(`\nAntes de correr este script, creá el tenant con:`)
  console.error(`  cd agencia-backend && pnpm create-client`)
  console.error(`\nRespondé "${TENANT_SLUG}" cuando te pida el slug. Después:`)
  console.error(`  pnpm seed:mood-full`)
  console.error('')
}

// --- Orchestrator ---

export const run = async (): Promise<void> => {
  printBanner()
  const payload = await getPayload({ config })

  // 1. Find tenant (fail with instructions if missing)
  const tenant = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: TENANT_SLUG } },
    limit: 1,
    overrideAccess: true,
  })
  if (tenant.totalDocs === 0) {
    printTenantMissing()
    process.exit(1)
  }
  const tenantDoc = tenant.docs[0] as { id: number; features?: Record<string, unknown> }

  // 2. Build and write the combined features object
  const stripeAccountId = resolveStripeAccountId()
  const features = buildFeatures(tenantDoc.features ?? {}, stripeAccountId)
  await payload.update({
    collection: 'tenants',
    id: tenantDoc.id,
    data: { features },
    overrideAccess: true,
  })
  printFeatureUpdate(tenantDoc.id, stripeAccountId)

  // 3. Upsert categories, build a slug → id map
  console.log('\nUpserting categories:')
  const categoryIds = new Map<string, number>()
  for (const category of CATEGORIES) {
    await upsertCategory(payload, tenantDoc.id, category)
    const found = await findCategoryBySlug(payload, tenantDoc.id, category.slug)
    if (!found) {
      throw new Error(`Internal: missing category ${category.slug} after upsert`)
    }
    categoryIds.set(category.slug, found.id)
    printCategoryUpserted(category, 'created')
  }
  console.log(`  ${CATEGORIES.length} categories processed.`)

  // 4. Upsert sneaker products
  console.log('\nUpserting sneaker products:')
  for (const product of SNEAKER_PRODUCTS) {
    const categoryId = categoryIds.get(product.categorySlug)
    if (!categoryId) {
      throw new Error(`Internal: missing category ${product.categorySlug}`)
    }
    const data = productToData(product, categoryId, tenantDoc.id)
    await upsertProduct(payload, tenantDoc.id, data)
    printProductUpserted(product, 'created')
  }
  console.log(`  ${SNEAKER_PRODUCTS.length} sneaker products processed.`)

  // 5. Upsert smoke products (imported, adapted to generic shape)
  console.log('\nUpserting smoke products:')
  for (const product of SMOKE_PRODUCTS) {
    const data = adaptSmokeProduct(product, tenantDoc.id)
    await upsertProduct(payload, tenantDoc.id, data)
    printProductUpserted(product, 'created')
  }
  console.log(`  ${SMOKE_PRODUCTS.length} smoke products processed.`)

  // 6. Print summary + next steps
  printSummary({
    categories: CATEGORIES.length,
    products: SNEAKER_PRODUCTS.length + SMOKE_PRODUCTS.length,
  })
  printNextSteps(stripeAccountId)

  // Payload keeps DB connections open; explicit exit prevents the wrapper hanging.
  process.exit(0)
}
