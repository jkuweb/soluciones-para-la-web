import type { FeatureModule } from './types'
import { installStub, uninstallStub } from './_stub'
import { install as welcomeBannerInstall } from './welcome-banner/install'
import { uninstall as welcomeBannerUninstall } from './welcome-banner/uninstall'

const stubFor = (slug: string, displayName: string, description: string): FeatureModule => ({
  slug,
  displayName,
  description,
  install: (ctx) => installStub(slug, ctx),
  uninstall: (ctx) => uninstallStub(slug, ctx),
  envKeysRequired: [],
})

export const FEATURES: Record<string, FeatureModule> = {
  catalog: stubFor(
    'catalog',
    'Catálogo de productos',
    'Products, Categories, /shop, /product/[slug]',
  ),
  payments: stubFor(
    'payments',
    'Pagos con Stripe',
    'Stripe checkout, webhooks, /cart, /checkout',
  ),
  shipping: stubFor('shipping', 'Envíos', 'Zonas geográficas + métodos de envío'),
  coupons: stubFor('coupons', 'Cupones', 'Códigos de descuento'),
  reviews: stubFor('reviews', 'Reviews', 'Ratings + comentarios en productos'),
  wishlist: stubFor('wishlist', 'Wishlist', 'Lista de deseos por cliente'),
  taxes: stubFor('taxes', 'Impuestos', 'Reglas de impuesto por país/categoría'),
  abandonedCart: stubFor(
    'abandonedCart',
    'Carrito abandonado',
    'Detección + email de recuperación',
  ),
  subscriptions: stubFor(
    'subscriptions',
    'Suscripciones',
    'Productos recurrentes (Stripe Subscriptions API)',
  ),
  welcomeBanner: {
    slug: 'welcomeBanner',
    displayName: 'Banner de bienvenida',
    description: 'Banner configurable por tenant con env var de fallback',
    install: welcomeBannerInstall,
    uninstall: welcomeBannerUninstall,
    envKeysRequired: ['WELCOME_BANNER_TEXT'],
  },
}

export const getFeature = (slug: string): FeatureModule | undefined => FEATURES[slug]

export const listFeatureSlugs = (): string[] => Object.keys(FEATURES)
