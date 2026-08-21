import Link from 'next/link'
import type { ProductGrid as ProductGridData, Product } from '@/lib/types'
import { getProducts, getMediaUrl } from '@/lib/payload'

function formatPrice(cents: number, currency: string): string {
  const value = cents / 100
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '£'
  return `${value.toFixed(2)} ${symbol}`
}

export default async function ProductGridBlock({ data }: { data: ProductGridData }) {
  const { heading, category, limit = 12, columns = '3' } = data
  const categorySlug = typeof category === 'object' ? category?.slug : undefined

  const { docs } = await getProducts(1, limit, categorySlug)

  if (docs.length === 0) {
    return (
      <section className="product-grid-empty" data-testid="product-grid-empty">
        <p>No hay productos disponibles.</p>
      </section>
    )
  }

  return (
    <section className="product-grid" data-testid="product-grid" data-columns={columns}>
      {heading && <h2 className="product-grid__heading">{heading}</h2>}
      <ul className={`product-grid__list product-grid__list--cols-${columns}`}>
        {docs.map((product: Product) => {
          const firstImage = product.images?.[0]?.image
          const imageUrl = firstImage ? getMediaUrl(firstImage.url ?? '') : null
          return (
            <li key={product.id} className="product-grid__item">
              <Link href={`/product/${product.slug}`} className="product-grid__link">
                {imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt={firstImage?.alt ?? product.title}
                    className="product-grid__image"
                    loading="lazy"
                  />
                )}
                <h3 className="product-grid__title">{product.title}</h3>
                <p className="product-grid__price">
                  {formatPrice(product.price, product.currency)}
                </p>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
