import { getLatestPosts } from '@/lib/payload'
import PostCard from '@/components/blog/PostCard'
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
    </div>
  )
}
