/**
 * Site configuration
 *
 * CLIENT-OWNED file — each client sets its own tenant slug, domain, and
 * site name here. The template never overwrites this file.
 */

export interface SiteConfig {
  /** Tenant slug matching the Payload multi-tenant plugin tenant slug */
  tenantSlug: string
  /** Custom domain where this site is served (e.g. "restaurantepepito.com") */
  domain: string
  /** Human-readable site name used in meta tags and page titles */
  siteName: string
}

export const SITE_CONFIG: SiteConfig = {
  tenantSlug: 'mi-tienda',
  domain: 'localhost:3000',
  siteName: 'Mi Tienda',
}
