'use client'

import React from 'react'

import { Media } from '@/components/Media/Media'
import RichText from '@/components/RichText/RichText'
import { CMSLink } from '@/components/Link/Link'
import type { ContentBlock as ContentBlockProps } from '@/payload-types'
import './Component.css'

type Props = ContentBlockProps & {
  className?: string
}

export const ContentBlock: React.FC<Props> = ({ media, links, className, content, title }) => {
  return (
    <section className={`${className || ''}`}>
      <div className={`${className}--heading-box`}>
        {title && <h2 className={`${className}--heading`}>{title}</h2>}
      </div>
      <div className={`${className}--main-box`}>
        <div className={`${className}--media-box`}>
          {media && <Media resource={media} className={`${className}--media`} />}
        </div>
        <RichText
          data={content as any}
          enableGutter={false}
          className={`${className}--content-box`}
        />
        {links?.length !== 0 && (
          <ul className={`${className}--list`}>
            {links &&
              links.map((link, index) => (
                <li className={`${className}--item`}>
                  <CMSLink key={index} {...link.link} />{' '}
                </li>
              ))}
          </ul>
        )}
      </div>
    </section>
  )
}
