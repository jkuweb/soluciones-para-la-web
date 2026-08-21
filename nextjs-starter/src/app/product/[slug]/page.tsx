import { notFound } from 'next/navigation'
import { getTenantFeatures } from '@/lib/tenant'
import { getProductBySlug, getMediaUrl } from '@/lib/payload'

function formatPrice(cents: number, currency: string): string {
  const value = cents / 100
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '£'
  return `${value.toFixed(2)} ${symbol}`
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return { title: 'Producto no encontrado' }
  return {
    title: product.title,
    description:
      typeof product.description === 'string'
        ? product.description
        : `${product.title} — ${formatPrice(product.price, product.currency)}`,
    openGraph: {
      title: product.title,
      images: product.images?.[0]?.image?.url
        ? [{ url: getMediaUrl(product.images[0].image.url ?? '') }]
        : undefined,
    },
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const features = getTenantFeatures()
  if (!features.catalog) {
    return (
      <div data-testid="product-redirected">
        <meta httpEquiv="refresh" content="0; url=/" />
      </div>
    )
  }

  const product = await getProductBySlug(slug)
  if (!product) notFound()

  return (
    <main className="product" data-testid="product-page">
      <h1 className="product__title">{product.title}</h1>

      {product.images && product.images.length > 0 && (
        <div className="product__gallery">
          {product.images.map((item, idx) => {
            const imageUrl = getMediaUrl(item.image.url ?? '')
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={idx}
                src={imageUrl}
                alt={item.image.alt ?? product.title}
                className="product__image"
                loading={idx === 0 ? 'eager' : 'lazy'}
              />
            )
          })}
        </div>
      )}

      <div className="product__details">
        <p className="product__price">
          {formatPrice(product.price, product.currency)}
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span className="product__compare-at">
              {' '}
              <s>{formatPrice(product.compareAtPrice, product.currency)}</s>
            </span>
          )}
        </p>

        {product.stock !== undefined && (
          <p className="product__stock">
            {product.stock > 0 ? `${product.stock} en stock` : 'Sin stock'}
          </p>
        )}

        {product.sku && <p className="product__sku">SKU: {product.sku}</p>}

        <button type="button" className="product__add-to-cart" disabled>
          Añadir al carrito
        </button>
        <p className="product__add-to-cart-hint">
          (El carrito llega en el feature `payments`).
        </p>
      </div>
    </main>
  )
}
