import { getMediaUrl } from '@/lib/payload'
import { serializeLexical } from '@/lib/lexical'
import type { Post as PostType } from '@/lib/types'
import styles from './Post.module.css'

export interface PostProps {
  post: PostType
}

export default function Post({ post }: PostProps) {
  const heroImageUrl = post.heroImage?.sizes?.hero?.url || post.heroImage?.url || ''
  const contentHtml = post.content ? serializeLexical(post.content) : ''

  return (
    <article className={styles.article}>
      {heroImageUrl && (
        <figure className={styles.heroFigure}>
          <img
            src={getMediaUrl(heroImageUrl)}
            alt={post.heroImage?.alt || post.title}
            className={styles.heroImage}
            decoding="async"
          />
        </figure>
      )}

      <header className={styles.header}>
        <h1 className={styles.title}>{post.title}</h1>
        <time dateTime={post.publishedAt} className={styles.date}>
          {new Intl.DateTimeFormat('es-AR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }).format(new Date(post.publishedAt))}
        </time>
      </header>

      {(post.categories && post.categories.length > 0) || (post.tags && post.tags.length > 0) ? (
        <div className={styles.taxonomy}>
          {post.categories && post.categories.length > 0 && (
            <div className={styles.taxonomyGroup}>
              <span className={styles.taxonomyLabel}>Categorías</span>
              <ul className={styles.taxonomyList} aria-label="Categorías">
                {post.categories.map((cat) => (
                  <li key={cat.id}>
                    <a href={`/blog/category/${cat.slug}`} className={styles.chip}>
                      {cat.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {post.tags && post.tags.length > 0 && (
            <div className={styles.taxonomyGroup}>
              <span className={styles.taxonomyLabel}>Etiquetas</span>
              <ul className={styles.taxonomyList} aria-label="Etiquetas">
                {post.tags.map((tag) => (
                  <li key={tag.id}>
                    <a href={`/blog/tag/${tag.slug}`} className={styles.chip}>
                      {tag.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}

      {contentHtml && (
        <div className={styles.content} dangerouslySetInnerHTML={{ __html: contentHtml }} />
      )}
    </article>
  )
}
