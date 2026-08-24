import type { Metadata } from 'next'
import './styles/variables.css'
import './styles/global.css'
import { SITE_CONFIG } from '@/content/site.config'
import Link from '@/components/Link'
import FooterBlock from '@/components/FooterBlock'
import CartProvider from '@/components/cart/CartProvider'
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
                <ul>
                  {header.navItems.map((item) => {
                    // 'simple' navigation renders every item as a flat link,
                    // ignoring any subItems the row may still have in the DB.
                    // 'withSubItems' (or undefined, for backwards compat) keeps
                    // the mega-menu behaviour.
                    const renderSubItems =
                      header.navigationType !== 'simple' &&
                      (item.subItems?.length ?? 0) > 0
                    return (
                    <li key={item.id}>
                      {renderSubItems ? (
                        <details>
                          <summary>{item.title}</summary>
                          <ul>
                            {item.subItems?.map((sub) => (
                              <li key={sub.id}>
                                <Link link={sub.link}>
                                  {sub.enableImage && sub.image?.url && (
                                    <img
                                      src={getMediaUrl(sub.image.url)}
                                      alt={sub.image.alt || ''}
                                    />
                                  )}
                                  <span>
                                    <span>{sub.title}</span>
                                    {sub.description && (
                                      <span>{sub.description}</span>
                                    )}
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : item.link ? (
                        <Link link={item.link}>{item.title}</Link>
                      ) : (
                        <span>{item.title}</span>
                      )}
                    </li>
                    )
                  })}
                </ul>
              </nav>
            )}
            {header?.ctaText && header?.ctaLink && (
              <Link link={header.ctaLink} className="site-cta">
                {header.ctaText}
              </Link>
            )}
          </header>
        )}
        <CartProvider>
          <main>{children}</main>
          <FooterBlock
            navItems={footer?.navItems}
            copyright={footer?.copyright}
            socialLinks={footer?.socialLinks}
          />
        </CartProvider>
      </body>
    </html>
  )
}
