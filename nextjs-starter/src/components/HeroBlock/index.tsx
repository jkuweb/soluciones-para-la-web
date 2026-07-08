import type { HeroBlock } from '@/lib/types'
import Link from '@/components/Link'

interface HeroProps {
  data: HeroBlock
}

export default function HeroBlock({ data }: HeroProps) {
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
      <div className="hero-block__content">
        <h1>{data.title}</h1>
        {data.subtitle && <p className="hero-block__subtitle">{data.subtitle}</p>}
        {data.information && <p className="hero-block__information">{data.information}</p>}
        {data.cta && data.cta.length > 0 && (
          <div className="hero-block__cta-group">
            {data.cta.map((item, i) => {
              const link = item.link
              if (!link?.label) return null
              return <Link key={item.id || i} link={link} className="hero-block__cta" />
            })}
          </div>
        )}
        {data.images && data.images.length > 0 && (
          <div className="hero-block__additional-images">
            {data.images.map((item, i) => {
              if (!item.image?.url) return null
              return (
                <img
                  key={item.id ?? item.image?.id ?? i}
                  src={item.image.url}
                  alt={item.image.alt || ''}
                  className="hero-block__additional-image"
                />
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
