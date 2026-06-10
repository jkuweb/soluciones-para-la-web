'use client'

import React from 'react'

import { Media } from '@/components/Media/Media'
import RichText from '@/components/RichText/RichText'
import { CMSLink } from '@/components/Link/Link'
import type { CTABlock as CTABlockProps } from '@/payload-types'
import './Component.css'

type Props = CTABlockProps & {
  className?: string
}

export const CTABlock: React.FC<Props> = ({ media, links, className, content }) => {
  return (
    <section className={`${className || ''}`}>
      {media && <Media resource={media} className={`${className}-media`} />}
      <RichText data={content as any} enableGutter={false} className={`${className}-content`} />
      <ul className={`${className}-list`}>
        {links &&
          links.map((link, index) => (
            <li key={index} className={`${className}-item`}>
              <CMSLink {...link.link} />{' '}
            </li>
          ))}
      </ul>
    </section>
  )
}
