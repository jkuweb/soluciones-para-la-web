import { notFound } from 'next/navigation'
import { getPostBySlug, getMediaUrl } from '@/lib/payload'
import Post from '@/components/blog/Post'
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

  return <Post post={post} />
}
