import { notFound } from 'next/navigation'
import { getCategoryBySlug, getPostsByCategory, getMediaUrl } from '@/lib/payload'
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
          <article key={post.id}>
            {post.heroImage?.url && (
              <img
                src={getMediaUrl(post.heroImage.url)}
                alt={post.heroImage.alt || ''}
                style={{ width: '100%', height: 'auto', objectFit: 'cover' }}
              />
            )}
            {/* TODO PR 5: Replace with PostCard component */}
            <h2>
              <a href={`/blog/post/${post.slug}`}>{post.title}</a>
            </h2>
            {post.excerpt && <p>{post.excerpt}</p>}
            <time dateTime={post.publishedAt}>
              {new Intl.DateTimeFormat('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }).format(new Date(post.publishedAt))}
            </time>
          </article>
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
