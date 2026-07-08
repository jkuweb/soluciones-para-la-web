import Link from '@/components/Link'

interface LinkItem {
  id?: string
  link: {
    type?: 'reference' | 'custom'
    label?: string
    url?: string
    newTab?: boolean
  }
}

interface FooterBlockProps {
  navItems?: LinkItem[]
  copyright?: string
  socialLinks?: LinkItem[]
}

export default function FooterBlock({ navItems, copyright, socialLinks }: FooterBlockProps) {
  return (
    <footer className="site-footer">
      {navItems && navItems.length > 0 && (
        <nav className="site-footer__nav">
          {navItems.map((item) => (
            <Link key={item.id} link={item.link} className="site-footer__nav-item" />
          ))}
        </nav>
      )}
      {copyright && <p className="site-footer__copyright">{copyright}</p>}
      {socialLinks && socialLinks.length > 0 && (
        <div className="site-footer__social">
          {socialLinks.map((item) => (
            <Link key={item.id} link={item.link} className="site-footer__social-link" />
          ))}
        </div>
      )}
    </footer>
  )
}
