import { notFound } from 'next/navigation'
import { getCategoryBySlug, getPostsByCategory } from '@/lib/payload'
import PostCard from '@/components/blog/PostCard'
import type { Metadata } from 'next'

type Params = Promise<{ slug: string }>
type SearchParams = Promise<{ page?: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  if (!category) return {}
  return {
    title: `${category.title} — Blog`,
    description: `Artículos en la categoría ${category.title}`,
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const { slug } = await params
  const page = Number((await searchParams).page) || 1
  const category = await getCategoryBySlug(slug)
  if (!category) notFound()
  const { docs: posts, totalPages } = await getPostsByCategory(slug, page, 10)

  return (
    <div>
      <h1>{category.title}</h1>
      {posts.length === 0 && <p>No hay artículos en esta categoría.</p>}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '24px',
        }}
      >
        {posts.map((post) => (
          <PostCard
            key={post.id}
            title={post.title}
            slug={post.slug}
            publishedAt={post.publishedAt}
            heroImage={post.heroImage}
            excerpt={post.excerpt}
            categories={post.categories}
          />
        ))}
      </div>
      {totalPages > 1 && (
        <nav aria-label="Paginación">
          {page > 1 && <a href={`/blog/category/${slug}?page=${page - 1}`}>Anterior</a>}
          <span>
            {' '}
            Página {page} de {totalPages}{' '}
          </span>
          {page < totalPages && <a href={`/blog/category/${slug}?page=${page + 1}`}>Siguiente</a>}
        </nav>
      )}
    </div>
  )
}
