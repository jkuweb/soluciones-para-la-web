'use client'

import React from 'react'

import { Media } from '@/components/Media/Media'
import RichText from '@/components/RichText/RichText'
import type { ListBlock as ListBlockProps } from '@/payload-types'
import { Icon } from './Icon'
import './Component.css'
import { CMSLink } from '@/components/Link/Link'

type Props = ListBlockProps & {
  className?: string
}

export const ListBlock: React.FC<Props> = ({ media, list, links, className }) => {
  if (!list || !Array.isArray(list)) {
    return null
  }
  return (
    <section className={`${className || ''}`}>
      <h2 className={`${className}-title`}>
        Cómo lanzaremos <span>tu web</span>{' '}
      </h2>
      {media && <Media resource={media} className={`${className}-media`} />}
      <ul className={`${className}-list`}>
        {list.map((item, index) => {
          const { text, details } = item

          return (
            <li key={index} className={`${className}-item`}>
              <Icon />
              {text && <h3>{text}</h3>}
              {details && <RichText data={details} enableGutter={false} />}
            </li>
          )
        })}
      </ul>
      {links && links.map((link, index) => <CMSLink key={index} {...link.link} />)}
    </section>
  )
}
