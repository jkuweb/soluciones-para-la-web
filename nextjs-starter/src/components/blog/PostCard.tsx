import { getMediaUrl } from '@/lib/payload'
import type { MediaImage } from '@/lib/types'
import Link from 'next/link'
import styles from './PostCard.module.css'

export interface PostCardProps {
  title: string
  slug: string
  publishedAt: string
  heroImage: MediaImage
  excerpt?: string
  categories?: { id: string; title: string; slug: string }[]
}

export default function PostCard({
  title,
  slug,
  publishedAt,
  heroImage,
  excerpt,
  categories,
}: PostCardProps) {
  const imageUrl = heroImage.sizes?.card?.url || heroImage.url || ''
  const formattedDate = new Intl.DateTimeFormat('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(publishedAt))

  return (
    <article className={styles.card}>
      {imageUrl && (
        <div className={styles.imageWrapper}>
          <img
            src={getMediaUrl(imageUrl)}
            alt={heroImage.alt || title}
            className={styles.image}
            loading="lazy"
            decoding="async"
          />
        </div>
      )}

      <div className={styles.body}>
        <div className={styles.meta}>
          <time dateTime={publishedAt} className={styles.date}>
            {formattedDate}
          </time>
        </div>

        <h2 className={styles.title}>
          <Link href={`/blog/post/${slug}`} className={styles.titleLink}>
            {title}
          </Link>
        </h2>

        {excerpt && <p className={styles.excerpt}>{excerpt}</p>}

        {categories && categories.length > 0 && (
          <ul className={styles.categories} aria-label="Categorías">
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={`/blog/category/${cat.slug}`}
                  className={styles.categoryChip}
                >
                  {cat.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}
