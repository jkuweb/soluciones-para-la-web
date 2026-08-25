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
  { name: 'Running',          slug: 'running',          description: 'Zapatillas de running para entrenamiento diario, tiradas largas y carreras.' },
  { name: 'Basketball',       slug: 'basketball',       description: 'Zapatillas de basketball con amortiguación reactiva y soporte lateral.' },
  { name: 'Casual',           slug: 'casual',           description: 'Estilo urbano para el día a día. Comodidad sin renunciar al diseño.' },
  { name: 'Limited Editions', slug: 'limited-editions', description: 'Drops exclusivos y ediciones limitadas. Pocas unidades disponibles.' },
] as const

export const SNEAKER_PRODUCTS: readonly SneakerProduct[] = [
  // Running
  { title: 'Nike Pegasus 41',                slug: 'nike-pegasus-41',
    description: 'Zapatillas de running con amortiguación React Foam para entrenamientos diarios y tiradas largas.',
    price: 14999, currency: 'USD', categorySlug: 'running',          stock: 100, sku: 'NK-PEG-41' },

  { title: 'Adidas Ultraboost Light',        slug: 'adidas-ultraboost-light',
    description: 'Las Ultraboost más ligeras hasta la fecha. Espuma Light BOOST para máxima reactividad.',
    price: 18999, compareAtPrice: 21999, currency: 'USD', categorySlug: 'running', stock: 60, sku: 'AD-UB-LT' },

  { title: 'New Balance Fresh Foam 1080',    slug: 'new-balance-fresh-foam-1080',
    description: 'Máxima amortiguación con Fresh Foam X. Ideales para corredores de larga distancia que buscan comfort.',
    price: 16499, currency: 'EUR', categorySlug: 'running',          stock: 80, sku: 'NB-FF-1080' },

  { title: 'Asics Gel-Kayano 30',            slug: 'asics-gel-kayano-30',
    description: 'Estabilidad y soporte para pronadores. Tecnología FF BLAST PLUS para una pisada más suave.',
    price: 16999, currency: 'EUR', categorySlug: 'running',          stock: 70, sku: 'AS-GK-30' },

  // Basketball
  { title: 'Air Jordan 1 Mid',               slug: 'air-jordan-1-mid',
    description: 'El icónico Jordan 1 en su versión mid. Cuero premium y amortiguación Air-Sole en el talón.',
    price: 12999, currency: 'USD', categorySlug: 'basketball',       stock: 50, sku: 'AJ1-MID' },

  { title: 'Nike Kobe 8 Protro',             slug: 'nike-kobe-8-protro',
    description: 'Reedición del clásico Kobe 8 con amortiguación React moderna y construcción low-top para máxima movilidad.',
    price: 18999, currency: 'USD', categorySlug: 'basketball',       stock: 30, sku: 'NK-KB8-P' },

  { title: 'Adidas Harden Vol. 7',           slug: 'adidas-harden-vol-7',
    description: 'La firma de James Harden. Suela BOOST para explosividad en cada salto y corte.',
    price: 15999, currency: 'EUR', categorySlug: 'basketball',       stock: 45, sku: 'AD-HV7' },

  // Casual
  { title: 'Adidas Stan Smith',              slug: 'adidas-stan-smith',
    description: 'El clásico blanco y verde. Cuero sintético, suela de goma, atemporal.',
    price:  9999, currency: 'EUR', categorySlug: 'casual',           stock: 200, sku: 'AD-SS' },

  { title: 'Vans Old Skool',                 slug: 'vans-old-skool',
    description: 'Las zapatillas que empezaron todo. Lona resistente, suela waffle icónica, raya lateral.',
    price:  7999, currency: 'EUR', categorySlug: 'casual',           stock: 250, sku: 'VN-OS' },

  { title: 'Converse Chuck Taylor All Star', slug: 'converse-chuck-taylor-all-star',
    description: 'Las originales. Lona de algodón, suela de goma vulcanizada, inconfundibles.',
    price:  6999, currency: 'EUR', categorySlug: 'casual',           stock: 300, sku: 'CN-CT-AS' },

  // Limited Editions
  { title: 'Yeezy Boost 350 V2',             slug: 'yeezy-boost-350-v2',
    description: 'Drop exclusivo. Primeknit, tecnología BOOST, edición limitada.',
    price: 22999, compareAtPrice: 25999, currency: 'USD', categorySlug: 'limited-editions', stock: 5, sku: 'YZ-350V2' },

  { title: 'New Balance 990v6 MiUSA',        slug: 'new-balance-990v6-miusa',
    description: 'Fabricadas en Estados Unidos. Construcción premium, ENCAP y FuelCell para comfort diario.',
    price: 19999, currency: 'EUR', categorySlug: 'limited-editions', stock: 8, sku: 'NB-990V6' },
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

export const adaptSmokeProduct = (
  product: SmokeProduct,
  tenantId: number,
): PayloadProductData => ({
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

// (More helpers added in later tasks.)

// --- Orchestrator (placeholder) ---

export const run = async (): Promise<void> => {
  throw new Error('Not implemented yet')
}
