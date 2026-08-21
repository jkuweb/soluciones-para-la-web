/**
 * Reads tenant features from the build-time env.
 *
 * The install script writes `NEXT_PUBLIC_TENANT_FEATURES` to `.env` on the
 * client. The static build inlines it. For dev, defaults to all-false so
 * catalog blocks don't accidentally render in unconfigured tenants.
 */
export function getTenantFeatures(): Record<string, boolean> {
  const raw = process.env.NEXT_PUBLIC_TENANT_FEATURES
  if (!raw) {
    return {
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
  }
  try {
    return JSON.parse(raw) as Record<string, boolean>
  } catch {
    return {}
  }
}
