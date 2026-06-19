import type { Page, Media } from '@/payload-types'
import React from 'react'

type Props = {
  block: Extract<NonNullable<Page['hero']>[number], { blockType: 'hero' }>
}

export function HeroBlockRenderer({ block }: Props) {
  const bgImage = block.backgroundImage as Media | number | null | undefined

  return (
    <section
      style={{
        padding: '4rem 2rem',
        textAlign: 'center',
        backgroundColor: '#f5f5f5',
        backgroundImage: bgImage && typeof bgImage === 'object' && bgImage.url
          ? `url(${bgImage.url})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: bgImage ? '#fff' : '#333',
        borderRadius: 8,
        marginBottom: '2rem',
      }}
    >
      <h2 style={{ fontSize: '2.5rem', margin: '0 0 1rem' }}>{block.title}</h2>

      {block.subtitle && (
        <p style={{ fontSize: '1.25rem', opacity: 0.9 }}>{block.subtitle}</p>
      )}

      {block.information && (
        <p style={{ fontSize: '1rem', opacity: 0.85, maxWidth: 600, margin: '0 auto 1.5rem' }}>
          {block.information}
        </p>
      )}

      {block.cta && block.cta.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {block.cta.map((item) => {
            const link = item.link
            if (!link?.label) return null
            return (
              <a
                key={item.id || link.url}
                href={link.url || '#'}
                style={{
                  display: 'inline-block',
                  marginTop: '1.5rem',
                  padding: '0.75rem 2rem',
                  backgroundColor: '#0070f3',
                  color: '#fff',
                  borderRadius: 6,
                  textDecoration: 'none',
                }}
              >
                {link.label}
              </a>
            )
          })}
        </div>
      )}

      {block.images && block.images.length > 0 && (
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '2rem' }}>
          {block.images.map((imgEntry) => {
            const img = imgEntry.image as Media | number | undefined
            if (!img || typeof img !== 'object') return null
            return (
              <img
                key={img.id}
                src={img.url || ''}
                alt={img.alt || ''}
                style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 4 }}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}
