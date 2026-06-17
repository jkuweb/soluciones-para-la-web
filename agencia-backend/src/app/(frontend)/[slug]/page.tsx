export const dynamic = 'force-dynamic'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import type { Page, Media } from '@/payload-types'
import { draftMode } from 'next/headers'
import React from 'react'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import RichText from '@/components/RichText'

const queryPageBySlug = async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'pages',
    draft,
    limit: 1,
    pagination: false,
    overrideAccess: draft,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs?.[0] || null
}

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function Page({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = 'home' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)

  const page = await queryPageBySlug({ slug: decodedSlug })

  if (!page) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Page not found</h1>
        <p>No page found with slug: {decodedSlug}</p>
      </div>
    )
  }

  const { hero, layout } = page
  const heroBlock = hero?.[0]

  return (
    <>
      {draft && <LivePreviewListener />}
      <article style={{ maxWidth: 1200, margin: '0 auto', padding: '1rem' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1>{page.title}</h1>
        </header>
        {heroBlock && <HeroBlockRenderer block={heroBlock} />}
        {layout?.map((block, index) => (
          <BlockRenderer key={index} block={block} />
        ))}
      </article>
    </>
  )
}

function BlockRenderer({ block }: { block: NonNullable<Page['layout']>[number] }) {
  switch (block.blockType) {
    case 'text':
      return <TextBlockRenderer block={block} />
    case 'image':
      return <ImageBlockRenderer block={block} />
    case 'contact':
      return <ContactBlockRenderer block={block} />
    case 'menu':
      return <MenuBlockRenderer block={block} />
    case 'product':
      return <ProductBlockRenderer block={block} />
    case 'cart':
      return <CartBlockRenderer block={block} />
    case 'course':
      return <CourseBlockRenderer block={block} />
    case 'footer':
      return <FooterBlockRenderer block={block} />
    default:
      return null
  }
}

function HeroBlockRenderer({ block }: { block: Extract<NonNullable<Page['hero']>[number], { blockType: 'hero' }> }) {
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
      {block.cta?.label && (
        <a
          href={block.cta.url || '#'}
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
          {block.cta.label}
        </a>
      )}
    </section>
  )
}

function TextBlockRenderer({ block }: { block: Extract<NonNullable<Page['layout']>[number], { blockType: 'text' }> }) {
  return (
    <section style={{ marginBottom: '2rem' }}>
      {block.heading && <h2>{block.heading}</h2>}
      {block.content && <RichText data={block.content as Parameters<typeof RichText>[0]['data']} />}
    </section>
  )
}

function ImageBlockRenderer({ block }: { block: Extract<NonNullable<Page['layout']>[number], { blockType: 'image' }> }) {
  const img = block.image as Media | number | undefined

  if (!img || typeof img !== 'object') {
    return null
  }

  return (
    <figure style={{ marginBottom: '2rem', textAlign: 'center' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img.url || ''}
        alt={img.alt || ''}
        style={{ maxWidth: '100%', height: 'auto', borderRadius: 8 }}
      />
      {block.caption && (
        <figcaption style={{ marginTop: '0.5rem', color: '#666', fontStyle: 'italic' }}>
          {block.caption}
        </figcaption>
      )}
    </figure>
  )
}

function ContactBlockRenderer({ block }: { block: Extract<NonNullable<Page['layout']>[number], { blockType: 'contact' }> }) {
  return (
    <section
      style={{
        marginBottom: '2rem',
        padding: '2rem',
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
      }}
    >
      <h2>Contacto</h2>
      {block.email && <p><strong>Email:</strong> {block.email}</p>}
      {block.phone && <p><strong>Teléfono:</strong> {block.phone}</p>}
      {block.address && (
        <p>
          <strong>Dirección:</strong>
          <br />
          {block.address}
        </p>
      )}
      {block.mapUrl && (
        <a
          href={block.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#0070f3' }}
        >
          Ver en Google Maps
        </a>
      )}
    </section>
  )
}

function MenuBlockRenderer({ block }: { block: Extract<NonNullable<Page['layout']>[number], { blockType: 'menu' }> }) {
  return (
    <section style={{ marginBottom: '2rem' }}>
      {block.category && <h2>{block.category}</h2>}
      {block.items?.map((item, i) => (
        <div
          key={item.id || i}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '1rem 0',
            borderBottom: '1px solid #eee',
          }}
        >
          <div>
            <strong>{item.name}</strong>
            {item.description && (
              <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.9rem' }}>
                {item.description}
              </p>
            )}
          </div>
          {item.price != null && (
            <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
              €{item.price.toFixed(2)}
            </span>
          )}
        </div>
      ))}
    </section>
  )
}

function ProductBlockRenderer({ block }: { block: Extract<NonNullable<Page['layout']>[number], { blockType: 'product' }> }) {
  return (
    <section style={{ marginBottom: '2rem', padding: '2rem', border: '1px solid #eee', borderRadius: 8 }}>
      <h2>{block.name}</h2>
      {block.description && <RichText data={block.description as Parameters<typeof RichText>[0]['data']} />}
      <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0070f3' }}>
        €{block.price.toFixed(2)}
      </p>
      {block.category && <p><strong>Categoría:</strong> {block.category}</p>}
      {block.stock != null && <p><strong>Stock:</strong> {block.stock}</p>}
          {block.images && block.images.length > 0 && (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              {block.images.map((img, i) => {
                const image = img.image as Media | number | undefined
                if (!image || typeof image !== 'object') return null
                return (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={img.id || i}
                    src={image.url || ''}
                    alt={image.alt || ''}
                    style={{ width: 200, height: 200, objectFit: 'cover', borderRadius: 4 }}
                  />
                )
              })}
            </div>
          )}
    </section>
  )
}

function CartBlockRenderer({ block }: { block: Extract<NonNullable<Page['layout']>[number], { blockType: 'cart' }> }) {
  return (
    <section
      style={{
        marginBottom: '2rem',
        padding: '2rem',
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        textAlign: 'center',
      }}
    >
      <h2>Carrito</h2>
      <p style={{ color: '#666' }}>
        {block.emptyMessage || 'Tu carrito está vacío'}
      </p>
      <button
        style={{
          padding: '0.75rem 2rem',
          backgroundColor: '#0070f3',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        {block.checkoutButton || 'Finalizar compra'}
      </button>
    </section>
  )
}

function CourseBlockRenderer({ block }: { block: Extract<NonNullable<Page['layout']>[number], { blockType: 'course' }> }) {
  return (
    <section style={{ marginBottom: '2rem', padding: '2rem', border: '1px solid #eee', borderRadius: 8 }}>
      <h2>{block.title}</h2>
      {block.description && <RichText data={block.description as Parameters<typeof RichText>[0]['data']} />}
      <div style={{ display: 'flex', gap: '2rem', margin: '1rem 0', color: '#666' }}>
        {block.price != null && <span><strong>Precio:</strong> €{block.price.toFixed(2)}</span>}
        {block.duration && <span><strong>Duración:</strong> {block.duration}</span>}
      </div>
      {block.lessons && block.lessons.length > 0 && (
        <div>
          <h3>Lecciones ({block.lessons.length})</h3>
          {block.lessons.map((lesson, i) => (
            <div
              key={lesson.id || i}
              style={{
                padding: '1rem',
                marginBottom: '0.5rem',
                backgroundColor: '#f5f5f5',
                borderRadius: 6,
              }}
            >
              <strong>
                {i + 1}. {lesson.title}
              </strong>
              {lesson.description && (
                <p style={{ margin: '0.25rem 0', color: '#666' }}>{lesson.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function FooterBlockRenderer({ block }: { block: Extract<NonNullable<Page['layout']>[number], { blockType: 'footer' }> }) {
  return (
    <footer
      style={{
        marginTop: '3rem',
        padding: '2rem',
        backgroundColor: '#333',
        color: '#fff',
        borderRadius: 8,
        textAlign: 'center',
      }}
    >
      {block.copyright && (
        <p style={{ margin: 0 }}>{block.copyright}</p>
      )}
      {block.socialLinks?.map((item, i) => (
        <a
          key={item.id || i}
          href={item.link?.url || '#'}
          style={{ color: '#0070f3', margin: '0 0.5rem' }}
        >
          {item.link?.label || item.link?.url}
        </a>
      ))}
    </footer>
  )
}
