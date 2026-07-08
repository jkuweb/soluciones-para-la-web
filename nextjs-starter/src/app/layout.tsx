import type { Metadata } from 'next'
import './styles/variables.css'
import './styles/global.css'
import { SITE_CONFIG } from '@/content/site.config'
import Link from '@/components/Link'
import FooterBlock from '@/components/FooterBlock'
import { getHeader, getFooter, getMediaUrl } from '@/lib/payload'

export const metadata: Metadata = {
  title: {
    default: SITE_CONFIG.siteName,
    template: `%s | ${SITE_CONFIG.siteName}`,
  },
  robots: 'index, follow',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const header = await getHeader()
  const footer = await getFooter()

  return (
    <html lang="es">
      <body>
        {(header?.logo ||
          (header?.navItems && header.navItems.length > 0) ||
          (header?.ctaText && header?.ctaLink)) && (
          <header>
            {header?.logo && (
              <a
                href="/"
                className="site-logo"
                aria-label={`${SITE_CONFIG.siteName} — inicio`}
              >
                <img
                  src={getMediaUrl(header.logo.url)}
                  alt={header.logo.alt?.trim() || SITE_CONFIG.siteName}
                />
              </a>
            )}
            {header?.navItems && header.navItems.length > 0 && (
              <nav aria-label="Principal">
                {header.navItems.map((item) => (
                  <Link key={item.id} link={item.link} />
                ))}
              </nav>
            )}
            {header?.ctaText && header?.ctaLink && (
              <a
                href={
                  header.ctaLink.type === 'reference' &&
                  typeof header.ctaLink.reference?.value === 'object' &&
                  (header.ctaLink.reference.value as { slug?: string }).slug
                    ? `/${(header.ctaLink.reference.value as { slug: string }).slug}`
                    : header.ctaLink.url
                }
                className="site-cta"
                {...(header.ctaLink.newTab
                  ? { rel: 'noopener noreferrer', target: '_blank' }
                  : {})}
              >
                {header.ctaText}
              </a>
            )}
          </header>
        )}
        <main>{children}</main>
        <FooterBlock
          navItems={footer?.navItems}
          copyright={footer?.copyright}
          socialLinks={footer?.socialLinks}
        />
      </body>
    </html>
  )
}
