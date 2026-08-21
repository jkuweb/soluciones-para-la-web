import { notFound } from 'next/navigation'
import { getTenantFeatures } from '@/lib/tenant'
import { getProductCategoryBySlug, getProducts, getMediaUrl } from '@/lib/payload'
import Link from 'next/link'

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
  const category = await getProductCategoryBySlug(slug)
  return {
    title: category ? `${category.name} — Tienda` : 'Categoría no encontrada',
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const features = getTenantFeatures()
  if (!features.catalog) {
    return (
      <div data-testid="category-redirected">
        <meta httpEquiv="refresh" content="0; url=/" />
      </div>
    )
  }

  const category = await getProductCategoryBySlug(slug)
  if (!category) notFound()

  const { docs: products } = await getProducts(1, 48, slug)

  return (
    <main className="category" data-testid="category-page">
      <h1 className="category__title">{category.name}</h1>
      {category.description && <p className="category__description">{category.description}</p>}

      {products.length === 0 ? (
        <p>No hay productos en esta categoría.</p>
      ) : (
        <ul className="category__products">
          {products.map((product) => {
            const firstImage = product.images?.[0]?.image
            const imageUrl = firstImage ? getMediaUrl(firstImage.url ?? '') : null
            return (
              <li key={product.id}>
                <Link href={`/product/${product.slug}`}>
                  {imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt={firstImage?.alt ?? product.title} loading="lazy" />
                  )}
                  <h2>{product.title}</h2>
                  <p>{formatPrice(product.price, product.currency)}</p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <p>
        <Link href="/shop">← Volver a la tienda</Link>
      </p>
    </main>
  )
}
