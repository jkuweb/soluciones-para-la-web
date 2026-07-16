import { getLatestPosts, getMediaUrl } from '@/lib/payload'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const tenantName = process.env.TENANT_SLUG || 'Blog'
  return {
    title: `Blog — ${tenantName}`,
    description: 'Últimos artículos del blog',
    openGraph: { title: `Blog — ${tenantName}`, description: 'Últimos artículos del blog' },
  }
}

export default async function BlogIndexPage() {
  const posts = await getLatestPosts(10)

  return (
    <div>
      <h1>Blog</h1>
      {posts.length === 0 && <p>No hay artículos publicados aún.</p>}
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
            {post.categories && post.categories.length > 0 && (
              <ul style={{ display: 'flex', gap: '8px', listStyle: 'none', padding: 0 }}>
                {post.categories.map((cat) => (
                  <li key={cat.id}>
                    <a href={`/blog/category/${cat.slug}`}>{cat.title}</a>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
