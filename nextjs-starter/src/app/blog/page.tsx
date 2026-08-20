import { getCategories, getLatestPosts, getTags } from '@/lib/payload'
import { postSearchText } from '@/lib/blog-search-text'
import SearchAndFilter, {
  type SearchablePost,
} from '@/components/blog/SearchAndFilter'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const tenantName = process.env.TENANT_SLUG || 'Blog'
  return {
    title: `Blog — ${tenantName}`,
    description: 'Últimos artículos del blog',
    openGraph: {
      title: `Blog — ${tenantName}`,
      description: 'Últimos artículos del blog',
    },
  }
}

export default async function BlogIndexPage() {
  const [posts, categories, tags] = await Promise.all([
    getLatestPosts(100),
    getCategories(),
    getTags(),
  ])

  const postsWithSearchText: SearchablePost[] = posts.map((post) => ({
    ...post,
    searchText: postSearchText(post),
  }))

  return (
    <SearchAndFilter
      posts={postsWithSearchText}
      categories={categories}
      tags={tags}
    />
  )
}
