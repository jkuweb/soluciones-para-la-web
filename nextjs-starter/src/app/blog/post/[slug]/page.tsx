import { notFound } from 'next/navigation'
import { getPostBySlug, getMediaUrl } from '@/lib/payload'
import { serializeLexical } from '@/lib/lexical'
import type { Metadata } from 'next'

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return {}
  const title = post.metaTitle || post.title
  const description = post.metaDescription || post.excerpt || ''
  const imageUrl = post.metaImage?.url || post.heroImage?.url || ''
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: imageUrl ? [{ url: getMediaUrl(imageUrl) }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: imageUrl ? [getMediaUrl(imageUrl)] : undefined,
    },
  }
}

export default async function PostDetailPage({ params }: { params: Params }) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) notFound()

  const html = serializeLexical(post.content)

  return (
    <article>
      {post.heroImage?.url && (
        <img
          src={getMediaUrl(post.heroImage.url)}
          alt={post.heroImage.alt || ''}
          style={{ width: '100%', height: 'auto', objectFit: 'cover' }}
        />
      )}
      {/* TODO PR 5: Replace with Post component */}
      <h1>{post.title}</h1>
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
      {post.tags && post.tags.length > 0 && (
        <ul style={{ display: 'flex', gap: '8px', listStyle: 'none', padding: 0 }}>
          {post.tags.map((tag) => (
            <li key={tag.id}>
              <a href={`/blog/tag/${tag.slug}`}>{tag.title}</a>
            </li>
          ))}
        </ul>
      )}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  )
}
