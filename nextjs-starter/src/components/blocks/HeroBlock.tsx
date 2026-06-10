'use client'
import type { HeroBlock } from '@/lib/types'

interface HeroBlockProps {
  data: HeroBlock
}

export default function HeroBlock({ data }: HeroBlockProps) {
  return (
    <section className="hero-block">
      <div className="hero-content">
        <h1>{data.title}</h1>
        {data.subtitle && <p className="subtitle">{data.subtitle}</p>}
        {data.ctaText && data.ctaLink && (
          <a href={data.ctaLink} className="cta-button">
            {data.ctaText}
          </a>
        )}
      </div>
      <style jsx>{`
        .hero-block {
          background: var(--hero-bg, #f5f5f5);
          color: var(--hero-text, #333);
          padding: 4rem 2rem;
          text-align: center;
          min-height: 60vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hero-content h1 {
          font-size: 3rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }
        .subtitle {
          font-size: 1.25rem;
          margin-bottom: 2rem;
        }
        .cta-button {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          background: var(--primary-color, #007bff);
          color: white;
          text-decoration: none;
          border-radius: 4px;
          font-weight: 600;
        }
      `}</style>
    </section>
  )
}
