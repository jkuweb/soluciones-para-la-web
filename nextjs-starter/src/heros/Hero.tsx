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
        {data.cta?.label && (
          <Link link={data.cta} className="cta-button" />
        )}
        {data.images && data.images.length > 0 && (
          <div className="hero-additional-images">
            {data.images.map((item, i) => (
              <img
                key={i}
                src={item.image.url}
                alt={item.image.alt}
                className="hero-additional-image"
              />
            ))}
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
