import './styles/variables.css'
import './styles/global.css'
import Link from '@/components/Link'
import { getHeader, getFooter } from '@/lib/payload'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const header = await getHeader()
  const footer = await getFooter()

  return (
    <html lang="es">
      <body>
        {header?.navItems && header.navItems.length > 0 && (
          <nav>
            {header.navItems.map((item) => (
              <Link key={item.id} link={item.link} />
            ))}
          </nav>
        )}
        <main>{children}</main>
        {footer && (
          <footer>
            <div>
              {footer.navItems?.map((item) => (
                <Link key={item.id} link={item.link} />
              ))}
            </div>
            {footer.copyright && <p>{footer.copyright}</p>}
            {footer.socialLinks?.map((item) => (
              <Link key={item.id} link={item.link} />
            ))}
          </footer>
        )}
      </body>
    </html>
  )
}
