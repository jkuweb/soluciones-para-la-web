'use client'
import Link from '@/components/Link'
import type { FooterBlock } from '@/lib/types'

interface FooterBlockProps {
  data: FooterBlock
}

export default function FooterBlock({ data }: FooterBlockProps) {
  return (
    <footer className="footer-block">
      <div className="footer-content">
        {data.copyright && <p className="copyright">{data.copyright}</p>}
        {data.socialLinks && data.socialLinks.length > 0 && (
          <div className="social-links">
            {data.socialLinks.map((item) => (
              <Link key={item.id} link={item.link} />
            ))}
          </div>
        )}
      </div>
      <style jsx>{`
        .footer-block {
          background: var(--footer-bg, #333);
          color: var(--footer-text, #fff);
          padding: 2rem;
          text-align: center;
        }
        .copyright {
          margin-bottom: 1rem;
        }
        .social-links {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }
        .social-links a {
          color: inherit;
          text-decoration: none;
        }
      `}</style>
    </footer>
  )
}
