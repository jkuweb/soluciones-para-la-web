'use client'
import type { HeroBlock } from '@/lib/types'
import Link from '@/components/Link'

interface HeroProps {
  data: HeroBlock
}

export default function Hero({ data }: HeroProps) {
  const imageUrl =
    data.backgroundImage?.sizes?.hero?.url || data.backgroundImage?.url || ''

  return (
    <section
      className="hero-block"
      style={
        imageUrl
          ? {
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      <div className="hero-content">
        <h1>{data.title}</h1>
        {data.subtitle && <p className="subtitle">{data.subtitle}</p>}
        {data.information && <p className="information">{data.information}</p>}
        {data.cta && data.cta.length > 0 && (
          <div className="hero-cta-group">
            {data.cta.map((item, i) => {
              const link = item.link
              if (!link?.label) return null
              return <Link key={item.id || i} link={link} className="cta-button" />
            })}
          </div>
        )}
        {data.images && data.images.length > 0 && (
          <div className="hero-additional-images">
            {data.images.map((item, i) => {
              if (!item.image?.url) return null
              return (
                <img
                  key={item.id ?? item.image?.id ?? i}
                  src={item.image.url}
                  alt={item.image.alt || ''}
                  className="hero-additional-image"
                />
              )
            })}
          </div>
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
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        }
        .subtitle {
          font-size: 1.25rem;
          margin-bottom: 2rem;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
        }
        .information {
          font-size: 1rem;
          opacity: 0.85;
          max-width: 600px;
          margin: 0 auto 1.5rem;
        }
        .hero-cta-group {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
          flex-wrap: wrap;
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
        .hero-additional-images {
          display: flex;
          gap: var(--hero-image-gap, 1rem);
          justify-content: center;
          flex-wrap: wrap;
          margin-top: 2rem;
        }
        .hero-additional-image {
          width: var(--hero-image-size, 120px);
          height: var(--hero-image-size, 120px);
          object-fit: cover;
          border-radius: var(--hero-image-radius, 0);
        }
      `}</style>
    </section>
  )
}
