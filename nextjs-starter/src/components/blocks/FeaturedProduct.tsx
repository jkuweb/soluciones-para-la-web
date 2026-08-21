import Link from 'next/link'
import type { FeaturedProduct as FeaturedProductData } from '@/lib/types'
import { getMediaUrl, getProductBySlug } from '@/lib/payload'

function formatPrice(cents: number, currency: string): string {
  const value = cents / 100
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '£'
  return `${value.toFixed(2)} ${symbol}`
}

export default async function FeaturedProductBlock({ data }: { data: FeaturedProductData }) {
  const { product, showPrice = true, ctaLabel = 'Ver producto' } = data
  const productSlug = typeof product === 'object' ? product?.slug : product
  if (!productSlug) return null

  const fullProduct = await getProductBySlug(productSlug)
  if (!fullProduct) return null

  const firstImage = fullProduct.images?.[0]?.image
  const imageUrl = firstImage ? getMediaUrl(firstImage.url ?? '') : null

  return (
    <section className="featured-product" data-testid="featured-product">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={firstImage?.alt ?? fullProduct.title}
          className="featured-product__image"
          loading="lazy"
        />
      )}
      <div className="featured-product__body">
        <h3 className="featured-product__title">{fullProduct.title}</h3>
        {showPrice && (
          <p className="featured-product__price">
            {formatPrice(fullProduct.price, fullProduct.currency)}
          </p>
        )}
        <Link
          href={`/product/${fullProduct.slug}`}
          className="featured-product__cta"
        >
          {ctaLabel}
        </Link>
      </div>
    </section>
  )
}
