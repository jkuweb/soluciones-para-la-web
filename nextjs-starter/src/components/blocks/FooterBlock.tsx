'use client'
interface FooterBlockProps {
  data: {
    blockType: 'footer'
    copyright?: string
    socialLinks?: { platform: string; url: string }[]
  }
}

export default function FooterBlock({ data }: FooterBlockProps) {
  return (
    <footer className="footer-block">
      <div className="footer-content">
        {data.copyright && <p className="copyright">{data.copyright}</p>}
        {data.socialLinks && data.socialLinks.length > 0 && (
          <div className="social-links">
            {data.socialLinks.map((link, i) => (
              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer">
                {link.platform}
              </a>
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
