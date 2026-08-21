import Link from 'next/link'
import type { CategoryList as CategoryListData, ProductCategory } from '@/lib/types'
import { getMediaUrl, getProductCategories } from '@/lib/payload'

export default async function CategoryListBlock({ data }: { data: CategoryListData }) {
  const { heading = 'Categorías', layout = 'grid' } = data
  const categories: ProductCategory[] = await getProductCategories()

  if (categories.length === 0) return null

  return (
    <section className={`category-list category-list--${layout}`} data-testid="category-list">
      {heading && <h2 className="category-list__heading">{heading}</h2>}
      <ul className="category-list__items">
        {categories.map((cat) => {
          const imageUrl = cat.image ? getMediaUrl(cat.image.url ?? '') : null
          return (
            <li key={cat.id} className="category-list__item">
              <Link
                href={`/shop/category/${cat.slug}`}
                className="category-list__link"
              >
                {imageUrl && layout === 'grid' && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt={cat.image?.alt ?? cat.name}
                    className="category-list__image"
                    loading="lazy"
                  />
                )}
                <span className="category-list__name">{cat.name}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
