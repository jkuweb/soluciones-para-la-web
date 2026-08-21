import { getTenantFeatures } from '@/lib/tenant'
import { getProducts, getProductCategories, getMediaUrl } from '@/lib/payload'
import Link from 'next/link'

function formatPrice(cents: number, currency: string): string {
  const value = cents / 100
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '£'
  return `${value.toFixed(2)} ${symbol}`
}

export const metadata = {
  title: 'Tienda',
  description: 'Todos nuestros productos.',
}

export default async function ShopPage() {
  const features = getTenantFeatures()
  if (!features.catalog) {
    return (
      <div data-testid="shop-redirected">
        <meta httpEquiv="refresh" content="0; url=/" />
      </div>
    )
  }

  const [{ docs: products }, categories] = await Promise.all([
    getProducts(1, 24),
    getProductCategories(),
  ])

  return (
    <main className="shop" data-testid="shop-page">
      <h1 className="shop__title">Tienda</h1>

      {categories.length > 0 && (
        <nav className="shop__categories" aria-label="Categorías">
          <ul>
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link href={`/shop/category/${cat.slug}`}>{cat.name}</Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {products.length === 0 ? (
        <p className="shop__empty">No hay productos publicados todavía.</p>
      ) : (
        <ul className="shop__products">
          {products.map((product) => {
            const firstImage = product.images?.[0]?.image
            const imageUrl = firstImage ? getMediaUrl(firstImage.url ?? '') : null
            return (
              <li key={product.id} className="shop__product">
                <Link href={`/product/${product.slug}`} className="shop__product-link">
                  {imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt={firstImage?.alt ?? product.title}
                      loading="lazy"
                    />
                  )}
                  <h2>{product.title}</h2>
                  <p>{formatPrice(product.price, product.currency)}</p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
