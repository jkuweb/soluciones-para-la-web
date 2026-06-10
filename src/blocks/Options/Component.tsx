'use client'

import React from 'react'
import Link from 'next/link'

import { Media } from '@/components/Media/Media'
import RichText from '@/components/RichText/RichText'
import type { OptionsBlock as OptionsBlockProps } from '@/payload-types'
import { CMSLink } from '@/components/Link/Link'
import styles from './Component.module.css'

type Props = OptionsBlockProps & {
  className?: string
}

export const OptionsBlock: React.FC<Props> = ({ options, className }) => {
  if (!options || !Array.isArray(options)) {
    return null
  }

  return (
    <section className={`${styles.options} ${className || ''}`}>
      {options.map((option, index) => {
        const { media, text, price, link } = option

        const href =
          link?.type === 'reference' && typeof link?.reference?.value === 'object'
            ? `/${link.reference.value.slug}`
            : link?.url || '#'

        const target = link?.newTab ? '_blank' : undefined
        const rel = link?.newTab ? 'noopener noreferrer' : undefined

        return (
          <div key={index} className={styles.item}>
            <Link href={href} target={target} rel={rel}>
              {media && (
                <span className={styles.media}>
                  <Media resource={media} />
                </span>
              )}
              <div className={styles.content}>
                <RichText data={text} enableGutter={false} />
              </div>
              <div className={styles.price}>
                {typeof price === 'number' ? price.toFixed(2) : '0.00'}€
              </div>
            </Link>
          </div>
        )
      })}
    </section>
  )
}
