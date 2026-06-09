import { CMSLink } from '@/components/Link/Link'
import RichText from '@/components/RichText/RichText'
import styles from './RenderHero.module.css'
import { HeroMedia } from '@/components/HeroMedia/HeroMedia'

export const RenderHero = (props: { layout?: any }) => {
  const hero = props.layout
  const richText = hero?.richText
  const link = hero?.link
  const media = hero?.media

  const mediaUrl = typeof media === 'object' ? media?.url : ''

  return (
    <section className={styles.hero}>
      <h1 className={styles.title}>
        Tu negocio directo a <span>la luna</span>{' '}
      </h1>
      {richText && (
        <div className={styles.content}>
          <RichText className={''} data={richText} />
        </div>
      )}
      {link && (
        <div className={styles.link}>
          <CMSLink {...link} />
        </div>
      )}
      {mediaUrl && (
        <div className={styles.media}>
          <HeroMedia src={mediaUrl} />
        </div>
      )}
    </section>
  )
}
