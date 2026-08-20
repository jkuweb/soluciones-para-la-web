export const ECOMMERCE_TIERS = ['none', 'lite', 'standard', 'full'] as const
export type EcommerceTier = (typeof ECOMMERCE_TIERS)[number]

export const FEATURE_KEYS = [
  'catalog',
  'payments',
  'shipping',
  'coupons',
  'reviews',
  'wishlist',
  'taxes',
  'abandonedCart',
  'subscriptions',
] as const
export type FeatureKey = (typeof FEATURE_KEYS)[number]

export const TIER_DEFAULTS: Record<EcommerceTier, FeatureKey[]> = {
  none: [],
  lite: ['catalog', 'payments'],
  standard: ['catalog', 'payments', 'shipping', 'coupons'],
  full: [
    'catalog',
    'payments',
    'shipping',
    'coupons',
    'reviews',
    'wishlist',
    'taxes',
  ],
}

export const DEFAULT_FEATURES: Record<FeatureKey, boolean> = {
  catalog: false,
  payments: false,
  shipping: false,
  coupons: false,
  reviews: false,
  wishlist: false,
  taxes: false,
  abandonedCart: false,
  subscriptions: false,
}

export const isValidEcommerceTier = (value: unknown): value is EcommerceTier =>
  typeof value === 'string' && (ECOMMERCE_TIERS as readonly string[]).includes(value)

export const isValidFeatureName = (value: unknown): value is FeatureKey =>
  typeof value === 'string' && (FEATURE_KEYS as readonly string[]).includes(value)

export const defaultFeaturesForTier = (tier: EcommerceTier): Record<FeatureKey, boolean> => {
  const features = { ...DEFAULT_FEATURES }
  for (const key of TIER_DEFAULTS[tier]) features[key] = true
  return features
}

export const isValidFeaturesObject = (
  features: unknown,
): features is Record<FeatureKey, boolean> => {
  if (!features || typeof features !== 'object' || Array.isArray(features)) return false
  for (const key of FEATURE_KEYS) {
    if (!(key in features)) return false
    if (typeof (features as Record<string, unknown>)[key] !== 'boolean') return false
  }
  return true
}
